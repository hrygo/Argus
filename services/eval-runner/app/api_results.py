from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from .aggregation import aggregate_run, compare_case_results
from .db_models import ExperimentLaunchRecord, RunResultSnapshotRecord
from .models import ComparisonResponse, RunSummaryResponse
from .result_snapshots import create_result_snapshot, latest_result_snapshot

router = APIRouter(prefix="/api/v1/experiment-launches", tags=["Evaluation Results"])


def _db_manager():
    from .main import db_manager

    return db_manager


def _versions(manifest: dict[str, Any]) -> dict[str, Any]:
    return {
        "dataset": {
            "name": manifest.get("dataset", {}).get("dataset_name"),
            "version": manifest.get("dataset", {}).get("dataset_version"),
            "digest": manifest.get("dataset", {}).get("snapshot_digest"),
        },
        "agent": {
            "id": manifest.get("agent", {}).get("agent_id"),
            "version": manifest.get("agent", {}).get("version"),
            "spec_digest": manifest.get("agent", {}).get("spec_digest"),
            "artifact_ref": manifest.get("agent", {}).get("artifact_ref"),
        },
        "evaluators": manifest.get("evaluators", []),
        "runner": manifest.get("runner", {}),
        "environment": manifest.get("comparison", {}).get("environment", "production"),
    }


def _get_snapshot(session, launch_id: str) -> tuple[ExperimentLaunchRecord, RunResultSnapshotRecord]:
    launch = session.get(ExperimentLaunchRecord, launch_id)
    if not launch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Launch '{launch_id}' not found")
    snapshot = latest_result_snapshot(session, launch_id)
    if snapshot is None and launch.status in {"COMPLETED", "PARTIAL_FAILED", "FAILED", "CANCELLED"}:
        snapshot = create_result_snapshot(session, launch)
        session.commit()
    if snapshot is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Launch result snapshot is not ready")
    return launch, snapshot


@router.get("/{launch_id}/summary", response_model=RunSummaryResponse, summary="Get a stable run-level evaluation summary")
def get_run_summary(launch_id: str) -> RunSummaryResponse:
    with _db_manager().get_session() as session:
        _, snapshot = _get_snapshot(session, launch_id)
        from .db_models import LangfuseRunScoreTaskRecord

        score_task = session.scalars(select(LangfuseRunScoreTaskRecord).where(
            LangfuseRunScoreTaskRecord.snapshot_id == snapshot.id
        )).first()
        score_sync_status = score_task.status if score_task else (
            "NOT_APPLICABLE" if snapshot.manifest.get("dataset", {}).get("source") != "langfuse" else "PENDING"
        )
        return RunSummaryResponse(
            launch_id=snapshot.launch_id,
            snapshot_id=snapshot.id,
            revision=snapshot.revision,
            created_at=snapshot.created_at,
            manifest_digest=snapshot.manifest_digest,
            versions=_versions(snapshot.manifest),
            summary=snapshot.summary,
            langfuse_score_sync_status=score_sync_status,
        )


@router.get("/{launch_id}/comparison", response_model=ComparisonResponse, summary="Compare a Candidate against its frozen Baseline")
def get_launch_comparison(
    launch_id: str,
    classification: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    cursor: int = Query(default=0, ge=0),
) -> ComparisonResponse:
    allowed = {"REGRESSION", "IMPROVEMENT", "UNCHANGED", "NOT_COMPARABLE"}
    if classification and classification.upper() not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"classification must be one of {sorted(allowed)}")

    with _db_manager().get_session() as session:
        candidate_launch, candidate_snapshot = _get_snapshot(session, launch_id)
        comparison_manifest = candidate_snapshot.manifest.get("comparison", {})
        baseline_id = comparison_manifest.get("baseline_snapshot_id")
        baseline_snapshot = session.get(RunResultSnapshotRecord, baseline_id) if baseline_id else None
        if baseline_id and baseline_snapshot is None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Frozen Baseline result snapshot is unavailable")
        baseline_launch = session.get(ExperimentLaunchRecord, baseline_snapshot.launch_id) if baseline_snapshot else None

        baseline_items = {item["dataset_item_id"]: item for item in (baseline_snapshot.items if baseline_snapshot else [])}
        candidate_items = {item["dataset_item_id"]: item for item in candidate_snapshot.items}
        all_case_ids = sorted(set(baseline_items) | set(candidate_items))
        evaluator_specs = candidate_snapshot.manifest.get("evaluators", [])
        baseline_evaluators = baseline_snapshot.manifest.get("evaluators", []) if baseline_snapshot else []
        diffs: list[dict[str, Any]] = []
        comparable_baseline: list[dict[str, Any]] = []
        comparable_candidate: list[dict[str, Any]] = []
        classification_counts: Counter[str] = Counter()
        for case_id in all_case_ids:
            base_case = baseline_items.get(case_id)
            candidate_case = candidate_items.get(case_id)
            if baseline_snapshot is None:
                diff = compare_case_results(None, candidate_case, evaluator_specs=evaluator_specs, baseline_evaluators=baseline_evaluators)
                diff["reason"] = "BASELINE_NOT_BOUND"
            else:
                diff = compare_case_results(
                    base_case,
                    candidate_case,
                    evaluator_specs=evaluator_specs,
                    baseline_evaluators=baseline_evaluators,
                )
            diff["baseline_output_ref"] = base_case.get("output_ref") if base_case else None
            diff["candidate_output_ref"] = candidate_case.get("output_ref") if candidate_case else None
            diff["baseline_experiment_url"] = baseline_launch.langfuse_experiment_url if baseline_launch else None
            diff["candidate_experiment_url"] = candidate_launch.langfuse_experiment_url
            classification_counts[diff["classification"]] += 1
            if diff["classification"] != "NOT_COMPARABLE" and base_case and candidate_case:
                comparable_baseline.append(base_case)
                comparable_candidate.append(candidate_case)
            diffs.append(diff)

        if classification:
            diffs = [item for item in diffs if item["classification"] == classification.upper()]
        page = diffs[cursor : cursor + limit]
        next_cursor = cursor + limit if cursor + limit < len(diffs) else None

        comparable_count = sum(value for key, value in classification_counts.items() if key != "NOT_COMPARABLE")
        summary = {
            "candidate": candidate_snapshot.summary,
            "baseline": baseline_snapshot.summary if baseline_snapshot else None,
            "comparable_case_count": comparable_count,
            "classification_counts": dict(classification_counts),
        }
        if baseline_snapshot:
            baseline_common = aggregate_run(comparable_baseline, baseline_evaluators)
            candidate_common = aggregate_run(comparable_candidate, evaluator_specs)
            summary["comparable_cohort"] = {
                "baseline": baseline_common,
                "candidate": candidate_common,
            }
            baseline_pass = baseline_common.get("pass_rate")
            candidate_pass = candidate_common.get("pass_rate")
            summary["pass_rate_delta"] = (
                candidate_pass - baseline_pass
                if isinstance(candidate_pass, (int, float)) and isinstance(baseline_pass, (int, float))
                else None
            )
            baseline_core = baseline_common.get("score_means", {})
            candidate_core = candidate_common.get("score_means", {})
            summary["score_mean_deltas"] = {
                key: candidate_core[key] - baseline_core[key]
                for key in set(baseline_core) & set(candidate_core)
                if isinstance(candidate_core[key], (int, float)) and isinstance(baseline_core[key], (int, float))
            }
        else:
            summary["comparable_cohort"] = None
            summary["pass_rate_delta"] = None
            summary["score_mean_deltas"] = {}

        return ComparisonResponse(
            launch_id=launch_id,
            candidate_snapshot_id=candidate_snapshot.id,
            baseline_snapshot_id=baseline_snapshot.id if baseline_snapshot else None,
            baseline_binding_revision=comparison_manifest.get("baseline_binding_revision"),
            versions={"candidate": _versions(candidate_snapshot.manifest), "baseline": _versions(baseline_snapshot.manifest) if baseline_snapshot else None},
            summary=summary,
            classification_counts=dict(classification_counts),
            items=page,
            next_cursor=next_cursor,
        )
