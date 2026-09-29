from __future__ import annotations

from app.runner_identity import RunnerIdentity, validate_runner_identity


def test_worker_blocks_mismatched_identity_before_attempt_or_agent_request(setup_runtime, monkeypatch):
    import asyncio

    from app import worker as worker_module
    from app.db_models import ExecutionAttemptRecord, ExperimentItemExecutionRecord, ExperimentLaunchRecord
    from app.manifest import LaunchService
    from app.registry import AgentRegistry
    from app.runner_identity import current_runner_identity

    db_mgr, queue, limiter, orchestrator, _, _ = setup_runtime
    identity = current_runner_identity()
    launch = LaunchService(db_mgr, AgentRegistry(db_mgr), runner_version=identity.runner_version).create_launch(
        agent_id="test-agent",
        agent_version="v1",
        dataset_name="runner-identity-test",
        dataset_snapshot={
            "source": "seed",
            "dataset_id": "runner-identity-test",
            "dataset_name": "runner-identity-test",
            "dataset_version": "v1",
            "snapshot_digest": "sha256:test",
            "items": [{"id": "case-1", "input": {"text": "hello"}, "expected_output": {}}],
        },
    )
    orchestrator.start_launch(launch.id)
    with db_mgr.get_session() as session:
        item = session.query(ExperimentItemExecutionRecord).filter_by(launch_id=launch.id).one()
        item_id = item.id

    mismatched = RunnerIdentity(
        identity.runner_version, "test-build-different", identity.mapping_engine_version
    )
    blocked_worker = worker_module.ExecutionWorker(
        db_mgr, queue, limiter, worker_id="mismatched-worker", runner_identity=mismatched
    )
    agent_requests = []

    class ForbiddenAgentExecutor:
        def __init__(self, *_args, **_kwargs):
            agent_requests.append("constructed")
            raise AssertionError("Agent executor must not be created for a mismatched Runner")

    monkeypatch.setattr(worker_module, "RemoteAgentExecutor", ForbiddenAgentExecutor)
    messages = queue.read_group(blocked_worker.worker_id, count=1, block_ms=1)
    assert messages
    asyncio.run(blocked_worker.execute_item_message(*messages[0]))

    with db_mgr.get_session() as session:
        item = session.get(ExperimentItemExecutionRecord, item_id)
        attempts = session.query(ExecutionAttemptRecord).filter_by(item_execution_id=item_id).all()
        launch_record = session.get(ExperimentLaunchRecord, launch.id)
    assert agent_requests == []
    assert attempts == []
    assert item.execution_status == "failed"
    assert item.eval_status == "skipped"
    assert item.quality_conclusion == "unknown"
    assert item.execution_error == "RUNNER_VERSION_MISMATCH"
    assert item.lease_token is None
    assert item.active_attempt_id is None
    assert item.final_attempt_id is None
    assert launch_record.manifest["runner"]["build_id"] == identity.build_id



def identity(**overrides):
    values = {"runner_version": "1.2.0", "build_id": "sha256:abc123", "mapping_engine_version": "sha256:mapping-v1"}
    values.update(overrides)
    return RunnerIdentity(**values)


def test_matching_runner_identity_is_accepted():
    assert validate_runner_identity(identity().model_dump(), identity()) is None


def test_any_execution_version_difference_is_rejected():
    frozen = identity().model_dump()
    for field in ("runner_version", "build_id", "mapping_engine_version"):
        assert validate_runner_identity(frozen, identity(**{field: "different"})) == "RUNNER_VERSION_MISMATCH"


def test_missing_or_generic_build_identity_is_not_reliable():
    assert validate_runner_identity({"runner_version": "1.2.0", "build_id": "sha256:abc123", "mapping_engine_version": "sha256:mapping-v1"}, identity(build_id="")) == "RUNNER_IDENTITY_UNAVAILABLE"
    assert validate_runner_identity({"runner_version": "1.2.0", "build_id": "dev", "mapping_engine_version": "sha256:mapping-v1"}, identity(build_id="sha256:abc123")) == "RUNNER_IDENTITY_UNAVAILABLE"
    assert validate_runner_identity({"runner_version": "1.2.0", "build_id": "sha256:abc123"}, identity()) == "RUNNER_IDENTITY_UNAVAILABLE"


def test_legacy_manifest_identity_is_not_inferred():
    assert validate_runner_identity({}, identity()) == "RUNNER_IDENTITY_UNAVAILABLE"


def test_run_resume_and_retry_preflight_reject_runner_mismatch_without_mutation(setup_runtime):
    from app.db_models import ExperimentItemExecutionRecord, ExperimentLaunchRecord
    from app.manifest import LaunchService
    from app.registry import AgentRegistry
    from app.runner_identity import current_runner_identity
    from app.state_machine import DomainConflictError

    db_mgr, queue, limiter, orchestrator, _, _ = setup_runtime
    current = current_runner_identity()
    service = LaunchService(db_mgr, AgentRegistry(db_mgr), runner_version=current.runner_version)

    def create_launch(name):
        return service.create_launch(
            agent_id="test-agent",
            agent_version="v1",
            dataset_name=name,
            dataset_snapshot={
                "source": "seed",
                "dataset_id": name,
                "dataset_name": name,
                "dataset_version": "v1",
                "snapshot_digest": f"sha256:{name}",
                "items": [{"id": "case-1", "input": {}, "expected_output": {}}],
            },
        )

    wrong_runner = RunnerIdentity(current.runner_version, "different-build", current.mapping_engine_version)
    launch = create_launch("identity-run")
    orchestrator.runner_identity = wrong_runner
    with __import__("pytest").raises(DomainConflictError, match="RUNNER_VERSION_MISMATCH"):
        orchestrator.start_launch(launch.id)
    with db_mgr.get_session() as session:
        record = session.get(ExperimentLaunchRecord, launch.id)
        item = session.query(ExperimentItemExecutionRecord).filter_by(launch_id=launch.id).one()
        assert record.status == "PENDING"
        assert item.execution_status == "pending"
    assert queue.read_group("identity-preflight", count=10, block_ms=1) == []

    resume = create_launch("identity-resume")
    with db_mgr.get_session() as session:
        record = session.get(ExperimentLaunchRecord, resume.id)
        record.status = "CANCELLED"
        item = session.query(ExperimentItemExecutionRecord).filter_by(launch_id=resume.id).one()
        item.execution_status = "cancelled"
        session.commit()
    with __import__("pytest").raises(DomainConflictError, match="RUNNER_VERSION_MISMATCH"):
        orchestrator.resume_launch(resume.id)
    with db_mgr.get_session() as session:
        record = session.get(ExperimentLaunchRecord, resume.id)
        item = session.query(ExperimentItemExecutionRecord).filter_by(launch_id=resume.id).one()
        assert record.status == "CANCELLED"
        assert item.execution_status == "cancelled"

    retry = create_launch("identity-retry")
    with db_mgr.get_session() as session:
        record = session.get(ExperimentLaunchRecord, retry.id)
        record.status = "FAILED"
        item = session.query(ExperimentItemExecutionRecord).filter_by(launch_id=retry.id).one()
        item.execution_status = "failed"
        item.eval_status = "skipped"
        session.commit()
    with __import__("pytest").raises(DomainConflictError, match="RUNNER_VERSION_MISMATCH"):
        orchestrator.retry_failed_items(retry.id)
    with db_mgr.get_session() as session:
        record = session.get(ExperimentLaunchRecord, retry.id)
        item = session.query(ExperimentItemExecutionRecord).filter_by(launch_id=retry.id).one()
        assert record.status == "FAILED"
        assert item.execution_status == "failed"


def test_synchronous_execution_rejects_mismatch_before_lock_and_outbound_work(setup_runtime, monkeypatch):
    import asyncio

    from app import execution as execution_module
    from app.db_models import ExperimentLaunchRecord
    from app.execution import LaunchExecutionService
    from app.manifest import LaunchService
    from app.registry import AgentRegistry
    from app.runner_identity import current_runner_identity
    from fastapi import HTTPException

    db_mgr, _, _, _, _, _ = setup_runtime
    identity = current_runner_identity()
    launch = LaunchService(db_mgr, AgentRegistry(db_mgr), runner_version=identity.runner_version).create_launch(
        agent_id="test-agent",
        agent_version="v1",
        dataset_name="sync-identity-test",
        dataset_snapshot={
            "source": "seed",
            "dataset_id": "sync-identity-test",
            "dataset_name": "sync-identity-test",
            "dataset_version": "v1",
            "snapshot_digest": "sha256:sync-identity-test",
            "items": [{"id": "case-1", "input": {}, "expected_output": {}}],
        },
    )
    monkeypatch.setattr(
        execution_module,
        "current_runner_identity",
        lambda: RunnerIdentity(identity.runner_version, "different-build", identity.mapping_engine_version),
    )
    lock_attempts = []
    monkeypatch.setattr(
        execution_module,
        "acquire_launch_execution",
        lambda *args: lock_attempts.append(args) or False,
    )
    with __import__("pytest").raises(HTTPException) as caught:
        asyncio.run(LaunchExecutionService(db_mgr, AgentRegistry(db_mgr)).execute_launch(launch.id))
    assert caught.value.status_code == 409
    assert caught.value.detail == "RUNNER_VERSION_MISMATCH"
    assert lock_attempts == []
    with db_mgr.get_session() as session:
        record = session.get(ExperimentLaunchRecord, launch.id)
        assert record.status == "PENDING"
        assert record.started_at is None


def test_formal_launch_creation_rejects_generic_dev_build_identity(setup_runtime, monkeypatch):
    import pytest
    from app.manifest import LaunchService
    from app.registry import AgentRegistry
    from app.runner_identity import current_runner_identity

    db_mgr, _, _, _, _, _ = setup_runtime
    monkeypatch.setenv("ARGUS_BUILD_ID", "dev")
    identity = current_runner_identity()
    service = LaunchService(db_mgr, AgentRegistry(db_mgr), runner_version=identity.runner_version)
    with pytest.raises(ValueError, match="RUNNER_IDENTITY_UNAVAILABLE"):
        service.create_launch(
            agent_id="test-agent",
            agent_version="v1",
            dataset_name="unreproducible-run",
            dataset_snapshot={
                "source": "seed",
                "dataset_id": "unreproducible-run",
                "dataset_name": "unreproducible-run",
                "dataset_version": "v1",
                "snapshot_digest": "sha256:test",
                "items": [{"id": "case-1", "input": {}}],
            },
        )
