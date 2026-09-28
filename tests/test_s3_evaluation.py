from __future__ import annotations

from app.aggregation import aggregate_run, compare_case_results


def test_aggregate_run_keeps_execution_and_evaluation_failures_out_of_quality_pass_rate():
    summary = aggregate_run(
        [
            {"dataset_item_id": "pass", "execution_status": "succeeded", "eval_status": "succeeded", "quality_conclusion": "pass", "scores": {"correctness": 1.0}, "latency_ms": 100},
            {"dataset_item_id": "quality-fail", "execution_status": "succeeded", "eval_status": "succeeded", "quality_conclusion": "fail", "scores": {"correctness": 0.2}, "latency_ms": 400},
            {"dataset_item_id": "execution-error", "execution_status": "failed", "eval_status": "skipped", "quality_conclusion": "unknown", "scores": {}, "latency_ms": 800},
            {"dataset_item_id": "evaluator-error", "execution_status": "succeeded", "eval_status": "failed", "quality_conclusion": "unknown", "scores": {}, "latency_ms": 250},
        ],
        evaluator_specs=[{"id": "correctness", "threshold": 0.8, "critical": True}],
    )

    assert summary["total_cases"] == 4
    assert summary["evaluated_cases"] == 2
    assert summary["pass_rate"] == 0.5
    assert summary["evaluation_coverage"] == 0.5
    assert summary["execution_error_rate"] == 0.25
    assert summary["evaluator_error_count"] == 1
    assert summary["critical_failure_count"] == 1
    assert summary["p95_latency_ms"] == 400
    assert summary["cost_per_case"] is None
    assert summary["score_means"]["correctness"] == 0.6


def test_aggregate_run_reports_undefined_rates_when_there_are_no_cases():
    summary = aggregate_run([], evaluator_specs=[])

    assert summary["total_cases"] == 0
    assert summary["pass_rate"] is None
    assert summary["evaluation_coverage"] is None
    assert summary["execution_error_rate"] is None
    assert summary["p95_latency_ms"] is None


def test_case_comparison_classifies_quality_change_and_preserves_trace_references():
    diff = compare_case_results(
        {"case_digest": "same", "execution_status": "succeeded", "eval_status": "succeeded", "quality_conclusion": "pass", "scores": {"correctness": 1.0}, "trace_id": "baseline-trace"},
        {"case_digest": "same", "execution_status": "succeeded", "eval_status": "succeeded", "quality_conclusion": "fail", "scores": {"correctness": 0.2}, "trace_id": "candidate-trace"},
        evaluator_specs=[{"id": "correctness", "version": "1.0.0", "threshold": 0.8}],
        baseline_evaluators=[{"id": "correctness", "version": "1.0.0", "threshold": 0.8}],
    )

    assert diff["classification"] == "REGRESSION"
    assert diff["reason"] == "QUALITY_CONCLUSION_CHANGED"
    assert diff["score_deltas"]["correctness"] == -0.8
    assert diff["baseline_trace_id"] == "baseline-trace"
    assert diff["candidate_trace_id"] == "candidate-trace"


def test_case_comparison_marks_changed_dataset_case_not_comparable():
    diff = compare_case_results(
        {"case_digest": "before", "quality_conclusion": "pass", "scores": {}},
        {"case_digest": "after", "quality_conclusion": "fail", "scores": {}},
        evaluator_specs=[],
        baseline_evaluators=[],
    )

    assert diff["classification"] == "NOT_COMPARABLE"
    assert diff["reason"] == "CASE_CONTENT_CHANGED"


def test_run_scope_evaluators_are_not_treated_as_case_scores():
    item_specs = [
        {"id": "correctness", "version": "1.0.0", "scope": "item", "threshold": 0.8},
        {"id": "run_pass_rate", "version": "1.0.0", "scope": "run", "threshold": 1.0},
    ]
    baseline = {
        "dataset_item_id": "case-1",
        "case_digest": "same-case",
        "execution_status": "succeeded",
        "eval_status": "succeeded",
        "quality_conclusion": "pass",
        "scores": {"correctness": 1.0},
    }
    candidate = {**baseline, "scores": {"correctness": 1.0}}

    diff = compare_case_results(
        baseline,
        candidate,
        evaluator_specs=item_specs,
        baseline_evaluators=item_specs,
    )
    summary = aggregate_run(
        [{**candidate, "latency_ms": 50}],
        item_specs,
    )

    assert diff["classification"] == "UNCHANGED"
    assert summary["score_means"] == {"correctness": 1.0}
