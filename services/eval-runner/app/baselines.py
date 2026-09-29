from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .db import DatabaseManager
from .db_models import BaselineBindingRecord, ExperimentLaunchRecord, RunResultSnapshotRecord


class BaselineConflictError(ValueError):
    pass


def normalize_environment(value: str) -> str:
    normalized = value.strip().lower()
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,63}", normalized):
        raise ValueError("environment must be 1-64 lowercase letters, digits, dots, underscores, or hyphens")
    return normalized


def validate_baseline_snapshot(
    snapshot: RunResultSnapshotRecord,
    launch: ExperimentLaunchRecord,
    agent_id: str,
) -> None:
    if snapshot.agent_id != agent_id or launch.agent_id != agent_id:
        raise ValueError("Baseline result snapshot belongs to a different Agent")
    if launch.status != "COMPLETED":
        raise ValueError("Only fully completed Launches can be bound as a Baseline")
    summary = snapshot.summary or {}
    total = int(summary.get("total_cases", 0))
    if total <= 0 or int(summary.get("evaluated_cases", 0)) != total:
        raise ValueError("Baseline requires a non-empty run with complete successful evaluation coverage")
    if int(summary.get("execution_error_count", 0)) or int(summary.get("evaluator_error_count", 0)):
        raise ValueError("Baseline cannot contain execution or Evaluator errors")


def set_baseline(
    db_manager: DatabaseManager,
    *,
    agent_id: str,
    environment: str,
    result_snapshot_id: str,
    expected_revision: int,
    updated_by: str | None = None,
) -> BaselineBindingRecord:
    environment = normalize_environment(environment)
    try:
        with db_manager.get_session() as session:
            from .db_models import AgentRecord

            agent_stmt = select(AgentRecord).where(AgentRecord.id == agent_id)
            if db_manager.engine.dialect.name == "postgresql":
                agent_stmt = agent_stmt.with_for_update()
            if session.scalars(agent_stmt).first() is None:
                raise KeyError(f"Agent '{agent_id}' not found")
            snapshot = session.get(RunResultSnapshotRecord, result_snapshot_id)
            if not snapshot:
                raise KeyError(f"Result snapshot '{result_snapshot_id}' not found")
            # Load the Launch explicitly rather than depending on a lazy ORM relationship.
            launch = session.get(ExperimentLaunchRecord, snapshot.launch_id)
            if not launch:
                raise KeyError(f"Launch for result snapshot '{result_snapshot_id}' not found")
            validate_baseline_snapshot(snapshot, launch, agent_id)

            statement = select(BaselineBindingRecord).where(
                BaselineBindingRecord.agent_id == agent_id,
                BaselineBindingRecord.environment == environment,
            )
            if db_manager.engine.dialect.name == "postgresql":
                statement = statement.with_for_update()
            binding = session.scalars(statement).first()
            current_revision = binding.revision if binding else 0
            if current_revision != expected_revision:
                raise BaselineConflictError(
                    f"Baseline revision conflict: expected {expected_revision}, current {current_revision}"
                )
            if binding and binding.result_snapshot_id == result_snapshot_id:
                return binding
            if binding:
                binding.result_snapshot_id = result_snapshot_id
                binding.revision += 1
                binding.updated_by = updated_by
                binding.updated_at = datetime.utcnow()
            else:
                binding = BaselineBindingRecord(
                    agent_id=agent_id,
                    environment=environment,
                    result_snapshot_id=result_snapshot_id,
                    revision=1,
                    updated_by=updated_by,
                    updated_at=datetime.utcnow(),
                )
                session.add(binding)
            session.commit()
            session.refresh(binding)
            return binding
    except IntegrityError as exc:
        raise BaselineConflictError("Baseline revision conflict: another update won the compare-and-swap") from exc

def get_baseline(db_manager: DatabaseManager, agent_id: str, environment: str) -> tuple[BaselineBindingRecord, RunResultSnapshotRecord] | None:
    environment = normalize_environment(environment)
    with db_manager.get_session() as session:
        binding = session.get(BaselineBindingRecord, (agent_id, environment))
        if not binding:
            return None
        snapshot = session.get(RunResultSnapshotRecord, binding.result_snapshot_id)
        if not snapshot:
            raise RuntimeError("Baseline binding points to a missing result snapshot")
        # Detach-safe response requires scalar JSON fields, which are already loaded.
        return binding, snapshot
