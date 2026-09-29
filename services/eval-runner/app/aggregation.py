from __future__ import annotations

import math
from typing import Any

_COMPARABLE_QUALITY = {"pass", "fail"}


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    number = float(value)
    return number if math.isfinite(number) else None


def _item_evaluator_specs(specs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [spec for spec in specs if spec.get("scope", "item") == "item"]


def aggregate_run(items: list[dict[str, Any]], evaluator_specs: list[dict[str, Any]]) -> dict[str, Any]:
    """Build deterministic run-level metrics without conflating execution and quality failures."""
    evaluator_specs = _item_evaluator_specs(evaluator_specs)
    total = len(items)
    evaluated = [
        item
        for item in items
        if str(item.get("execution_status", "")).lower() == "succeeded"
        and str(item.get("eval_status", "")).lower() == "succeeded"
        and str(item.get("quality_conclusion", "")).lower() in _COMPARABLE_QUALITY
    ]
    passed = sum(str(item.get("quality_conclusion", "")).lower() == "pass" for item in evaluated)
    execution_errors = sum(
        str(item.get("execution_status", "")).lower() in {"failed", "timed_out"} for item in items
    )
    evaluator_errors = sum(
        str(item.get("execution_status", "")).lower() == "succeeded"
        and str(item.get("eval_status", "")).lower() == "failed"
        for item in items
    )

    score_values: dict[str, list[float]] = {str(spec["id"]): [] for spec in evaluator_specs}
    critical_failed_cases: set[str] = set()
    spec_by_id = {str(spec["id"]): spec for spec in evaluator_specs}
    for item in items:
        if str(item.get("execution_status", "")).lower() != "succeeded" or str(item.get("eval_status", "")).lower() != "succeeded":
            continue
        scores = item.get("scores") or {}
        case_id = str(item.get("dataset_item_id", item.get("id", "")))
        for evaluator_id, spec in spec_by_id.items():
            value = _finite_number(scores.get(evaluator_id))
            if value is not None:
                score_values[evaluator_id].append(value)
            if spec.get("critical") and (value is None or value < float(spec.get("threshold", 1.0))):
                critical_failed_cases.add(case_id)

    score_means = {
        evaluator_id: sum(values) / len(values) if values else None
        for evaluator_id, values in score_values.items()
    }
    score_counts = {evaluator_id: len(values) for evaluator_id, values in score_values.items()}

    latencies = sorted(
        latency
        for item in items
        if str(item.get("execution_status", "")).lower() == "succeeded"
        if (latency := _finite_number(item.get("latency_ms"))) is not None and latency >= 0
    )
    # Nearest-rank percentile: rank = ceil(p * n), then convert the 1-based rank to an index.
    p95 = latencies[max(0, math.ceil(0.95 * len(latencies)) - 1)] if latencies else None

    return {
        "total_cases": total,
        "evaluated_cases": len(evaluated),
        "passed_cases": passed,
        "failed_quality_cases": sum(str(item.get("quality_conclusion", "")).lower() == "fail" for item in evaluated),
        "pass_rate": passed / len(evaluated) if evaluated else None,
        "evaluation_coverage": len(evaluated) / total if total else None,
        "execution_error_count": execution_errors,
        "execution_error_rate": execution_errors / total if total else None,
        "evaluator_error_count": evaluator_errors,
        "critical_failure_count": len(critical_failed_cases),
        "score_means": score_means,
        "score_counts": score_counts,
        "p95_latency_ms": p95,
        "cost_per_case": None,
        "cost_unavailable_reason": "COST_NOT_RECORDED",
    }


def _contract(specs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keys = ("id", "version", "scope", "threshold", "params", "critical", "direction")
    return sorted(
        [{key: spec.get(key) for key in keys} for spec in specs],
        key=lambda item: (str(item.get("id")), str(item.get("version"))),
    )


def compare_case_results(
    baseline: dict[str, Any] | None,
    candidate: dict[str, Any] | None,
    *,
    evaluator_specs: list[dict[str, Any]],
    baseline_evaluators: list[dict[str, Any]],
) -> dict[str, Any]:
    """Classify one dataset item pair under an identical dataset/evaluator contract."""
    baseline = baseline or {}
    candidate = candidate or {}
    evaluator_specs = _item_evaluator_specs(evaluator_specs)
    baseline_evaluators = _item_evaluator_specs(baseline_evaluators)
    result: dict[str, Any] = {
        "dataset_item_id": candidate.get("dataset_item_id") or baseline.get("dataset_item_id"),
        "baseline_trace_id": baseline.get("trace_id"),
        "candidate_trace_id": candidate.get("trace_id"),
        "baseline_trace_url": baseline.get("trace_url"),
        "candidate_trace_url": candidate.get("trace_url"),
        "baseline_experiment_url": baseline.get("experiment_url"),
        "candidate_experiment_url": candidate.get("experiment_url"),
        "baseline_quality_conclusion": baseline.get("quality_conclusion", "unknown"),
        "candidate_quality_conclusion": candidate.get("quality_conclusion", "unknown"),
        "baseline_scores": baseline.get("scores") or {},
        "candidate_scores": candidate.get("scores") or {},
        "score_deltas": {},
    }

    if not baseline or not candidate:
        result.update(classification="NOT_COMPARABLE", reason="CASE_MISSING")
        return result
    digests = (baseline.get("case_digest"), candidate.get("case_digest"))
    if any(not isinstance(digest, str) or not digest for digest in digests):
        result.update(classification="NOT_COMPARABLE", reason="CASE_CONTENT_UNKNOWN")
        return result
    if digests[0] != digests[1]:
        result.update(classification="NOT_COMPARABLE", reason="CASE_CONTENT_CHANGED")
        return result
    if _contract(baseline_evaluators) != _contract(evaluator_specs):
        result.update(classification="NOT_COMPARABLE", reason="EVALUATION_CONTRACT_CHANGED")
        return result
    if any(str(item.get("execution_status", "")).lower() != "succeeded" for item in (baseline, candidate)):
        result.update(classification="NOT_COMPARABLE", reason="EXECUTION_ERROR")
        return result
    if any(str(item.get("eval_status", "")).lower() == "failed" for item in (baseline, candidate)):
        result.update(classification="NOT_COMPARABLE", reason="EVALUATOR_ERROR")
        return result
    if any(str(item.get("eval_status", "")).lower() != "succeeded" for item in (baseline, candidate)):
        result.update(classification="NOT_COMPARABLE", reason="EVALUATION_NOT_COMPLETED")
        return result
    baseline_scores = baseline.get("scores") or {}
    candidate_scores = candidate.get("scores") or {}
    has_regression = False
    has_improvement = False
    for spec in evaluator_specs:
        evaluator_id = str(spec["id"])
        before = _finite_number(baseline_scores.get(evaluator_id))
        after = _finite_number(candidate_scores.get(evaluator_id))
        if before is None or after is None:
            result.update(classification="NOT_COMPARABLE", reason="SCORE_MISSING")
            return result
        delta = after - before
        result["score_deltas"][evaluator_id] = delta
        if abs(delta) <= 1e-9:
            continue
        higher_is_better = spec.get("direction", "higher_is_better") == "higher_is_better"
        worsened = delta < 0 if higher_is_better else delta > 0
        has_regression |= worsened
        has_improvement |= not worsened

    before_quality = str(baseline.get("quality_conclusion", "unknown")).lower()
    after_quality = str(candidate.get("quality_conclusion", "unknown")).lower()
    if before_quality not in _COMPARABLE_QUALITY or after_quality not in _COMPARABLE_QUALITY:
        result.update(classification="NOT_COMPARABLE", reason="QUALITY_CONCLUSION_UNKNOWN")
    elif before_quality == "pass" and after_quality == "fail":
        result.update(classification="REGRESSION", reason="QUALITY_CONCLUSION_CHANGED")
    elif before_quality == "fail" and after_quality == "pass":
        result.update(classification="IMPROVEMENT", reason="QUALITY_CONCLUSION_CHANGED")
    elif has_regression:
        result.update(
            classification="REGRESSION",
            reason="MIXED_SCORE_CHANGES" if has_improvement else "SCORE_DECREASED",
        )
    elif has_improvement:
        result.update(classification="IMPROVEMENT", reason="SCORE_INCREASED")
    else:
        result.update(classification="UNCHANGED", reason="NO_QUALITY_CHANGE")
    return result
