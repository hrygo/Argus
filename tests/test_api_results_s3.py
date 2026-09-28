from __future__ import annotations

import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "services" / "eval-runner"))

from app import api_results, main  # noqa: E402
from app.db_models import ExperimentItemExecutionRecord, ExperimentLaunchRecord  # noqa: E402
from app.result_snapshots import create_result_snapshot  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


def _launch(db_mgr, quality: str, score: float, baseline_snapshot_id: str | None = None):
    launch_id = str(uuid.uuid4())
    manifest = {
        "schema_version": "1.1",
        "dataset": {
            "source": "seed",
            "dataset_name": "golden",
            "dataset_version": "sha256:same",
            "snapshot_digest": "same",
            "items": [{"id": "case-1", "input": {"q": "same"}, "expected_output": {"a": 1}, "metadata": {}}],
        },
        "agent": {"agent_id": "test-agent", "version": "v1", "spec_digest": "digest"},
        "evaluators": [{"id": "correctness", "version": "1.0.0", "threshold": 0.8, "direction": "higher_is_better"}],
        "runner": {"runner_version": "0.2.0", "build_id": "test"},
        "comparison": {
            "environment": "production",
            "baseline_snapshot_id": baseline_snapshot_id,
            "baseline_binding_revision": 1 if baseline_snapshot_id else None,
            "comparison_policy_version": "comparison-v1",
        },
    }
    with db_mgr.get_session() as session:
        launch = ExperimentLaunchRecord(
            id=launch_id,
            name="test",
            status="COMPLETED",
            quality_conclusion=quality,
            dataset_name="golden",
            dataset_version="sha256:same",
            agent_id="test-agent",
            agent_version="v1",
            agent_version_id="test-agent-v1",
            manifest=manifest,
            langfuse_experiment_url=f"https://langfuse.example/runs/{launch_id}",
        )
        session.add(launch)
        session.flush()
        session.add(ExperimentItemExecutionRecord(
            id=str(uuid.uuid4()),
            launch_id=launch_id,
            dataset_item_id="case-1",
            execution_status="succeeded",
            eval_status="succeeded",
            quality_conclusion=quality,
            scores={"correctness": score},
            trace_id=f"trace-{launch_id}",
            langfuse_trace_url=f"https://langfuse.example/project/project-1/traces/trace-{launch_id}",
            dispatch_generation=1,
        ))
        session.commit()
    with db_mgr.get_session() as session:
        launch = session.get(ExperimentLaunchRecord, launch_id)
        snapshot = create_result_snapshot(session, launch)
        session.commit()
        return launch_id, snapshot.id


def test_summary_and_comparison_use_frozen_baseline_and_trace_links(setup_runtime, monkeypatch):
    db_mgr, _, _, _, _, _ = setup_runtime
    baseline_launch, baseline_snapshot = _launch(db_mgr, "pass", 1.0)
    candidate_launch, _ = _launch(db_mgr, "fail", 0.2, baseline_snapshot)
    monkeypatch.setattr(api_results, "_db_manager", lambda: db_mgr)

    summary = api_results.get_run_summary(candidate_launch)
    assert summary.versions["dataset"]["version"] == "sha256:same"
    assert summary.summary["total_cases"] == 1

    comparison = api_results.get_launch_comparison(candidate_launch, classification=None, limit=50, cursor=0)
    assert comparison.baseline_snapshot_id == baseline_snapshot
    assert comparison.classification_counts == {"REGRESSION": 1}
    assert comparison.items[0]["baseline_trace_url"].endswith(f"trace-{baseline_launch}")
    assert comparison.items[0]["candidate_trace_url"].endswith(f"trace-{candidate_launch}")


def test_baseline_http_api_uses_revision_cas(setup_runtime, monkeypatch):
    db_mgr, _, _, _, _, _ = setup_runtime
    launch_id, snapshot_id = _launch(db_mgr, "pass", 1.0)
    monkeypatch.setattr(main, "db_manager", db_mgr)
    client = TestClient(main.app)
    path = "/api/v1/agents/test-agent/baselines"

    created = client.post(
        path,
        headers={"X-User": "release-manager"},
        json={
            "environment": "Production",
            "result_snapshot_id": snapshot_id,
            "expected_revision": 0,
        },
    )
    assert created.status_code == 200
    body = created.json()
    assert body["environment"] == "production"
    assert body["launch_id"] == launch_id
    assert body["revision"] == 1
    assert body["updated_by"] == "release-manager"

    fetched = client.get(path, params={"environment": "production"})
    assert fetched.status_code == 200
    assert fetched.json()["result_snapshot_id"] == snapshot_id

    stale_update = client.post(
        path,
        json={
            "environment": "production",
            "result_snapshot_id": snapshot_id,
            "expected_revision": 0,
        },
    )
    assert stale_update.status_code == 409
