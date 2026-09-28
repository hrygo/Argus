import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ComparisonReport } from "../../features/launches/ComparisonReport";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

const summary = {
  launch_id: "candidate-launch",
  snapshot_id: "candidate-snapshot",
  revision: 1,
  created_at: "2026-09-28T00:00:00Z",
  manifest_digest: "manifest-digest",
  versions: {
    agent: { id: "banking-agent", version: "2.4.0" },
    dataset: { name: "banking-golden", version: "2026-09" },
    evaluators: [{ id: "correctness", version: "1.0.0" }],
    runner: { runner_version: "0.2.0", build_id: "commit-abc123" },
    environment: "production",
  },
  summary: {
    pass_rate: 1,
    evaluation_coverage: 1,
    total_cases: 2,
    critical_failure_count: 0,
    execution_error_count: 0,
    execution_error_rate: 0,
    evaluator_error_count: 0,
    p95_latency_ms: 120,
    cost_per_case: null,
  },
  langfuse_score_sync_status: "SYNCED",
};

const comparisonPage = (caseId: string, nextCursor: number | null) => ({
  launch_id: "candidate-launch",
  candidate_snapshot_id: "candidate-snapshot",
  baseline_snapshot_id: "baseline-snapshot",
  baseline_binding_revision: 3,
  versions: {
    candidate: summary.versions,
    baseline: {
      ...summary.versions,
      agent: { id: "banking-agent", version: "2.3.0" },
    },
  },
  summary: {
    comparable_case_count: 2,
    comparable_cohort: {
      baseline: {
        pass_rate: 0.5,
        evaluation_coverage: 1,
        critical_failure_count: 1,
        execution_error_count: 0,
        execution_error_rate: 0,
        evaluator_error_count: 0,
        p95_latency_ms: 100,
        cost_per_case: null,
        score_means: { correctness: 0.7 },
      },
      candidate: {
        pass_rate: 1,
        evaluation_coverage: 1,
        critical_failure_count: 0,
        execution_error_count: 0,
        execution_error_rate: 0,
        evaluator_error_count: 0,
        p95_latency_ms: 120,
        cost_per_case: null,
        score_means: { correctness: 0.9 },
      },
    },
  },
  classification_counts: { REGRESSION: 1, IMPROVEMENT: 1, UNCHANGED: 0, NOT_COMPARABLE: 0 },
  items: [{
    dataset_item_id: caseId,
    classification: caseId === "case-1" ? "REGRESSION" : "IMPROVEMENT",
    reason: "SCORE_CHANGED",
    baseline_scores: { correctness: 0.7 },
    candidate_scores: { correctness: 0.9 },
    score_deltas: { correctness: 0.2 },
    baseline_trace_url: "https://langfuse.example/trace-baseline",
    candidate_trace_url: "https://langfuse.example/trace-candidate",
    baseline_experiment_url: "https://langfuse.example/experiment-baseline",
    candidate_experiment_url: "https://langfuse.example/experiment-candidate",
  }],
  next_cursor: nextCursor,
});

describe("ComparisonReport", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    (api.GET as any).mockImplementation((path: string, options: any) => {
      if (path.endsWith("/summary")) return Promise.resolve({ data: summary });
      if (path.includes("/baselines")) {
        return Promise.resolve({ error: {}, response: { status: 404 } });
      }
      if (path.endsWith("/comparison")) {
        const cursor = options.params.query.cursor;
        return Promise.resolve({
          data: cursor === 0 ? comparisonPage("case-1", 1) : comparisonPage("case-2", null),
        });
      }
      return Promise.resolve({ data: null });
    });
    (api.POST as any).mockResolvedValue({ data: { revision: 4 } });
  });

  it("shows the four frozen versions, aggregate deltas and every paginated case with Langfuse links", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ComparisonReport launchId="candidate-launch" launchStatus="COMPLETED" environment="production" />
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("table", { name: "Baseline 与 Candidate 聚合指标对比" })).toBeInTheDocument();
    expect(screen.getByText("banking-agent@2.3.0")).toBeInTheDocument();
    expect(screen.getByText("banking-agent@2.4.0")).toBeInTheDocument();
    expect(screen.getAllByText("correctness@1.0.0").length).toBeGreaterThan(0);
    expect(screen.getByText("+50.0 pp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Baseline Experiment/ })).toHaveAttribute(
      "href",
      "https://langfuse.example/experiment-baseline",
    );
    expect(screen.getByRole("link", { name: /Candidate Trace/ })).toHaveAttribute(
      "href",
      "https://langfuse.example/trace-candidate",
    );
    expect(await screen.findByText("case-1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "加载更多用例（已显示 1 条）" }));
    expect(await screen.findByText("case-2")).toBeInTheDocument();
    await waitFor(() => {
      expect((api.GET as any).mock.calls.some((call: any[]) => (
        call[0].endsWith("/comparison") && call[1].params.query.cursor === 1
      ))).toBe(true);
    });
  });

  it("binds the completed result as the environment baseline using the current revision", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ComparisonReport launchId="candidate-launch" launchStatus="COMPLETED" environment="production" />
      </QueryClientProvider>,
    );

    const setBaselineButton = await screen.findByRole("button", { name: "设为当前环境 Baseline" });
    await waitFor(() => expect(setBaselineButton).toBeEnabled());
    fireEvent.click(setBaselineButton);
    await waitFor(() => expect(api.POST).toHaveBeenCalledWith(
      "/api/v1/agents/{agent_id}/baselines",
      {
        params: { path: { agent_id: "banking-agent" } },
        body: {
          environment: "production",
          result_snapshot_id: "candidate-snapshot",
          expected_revision: 0,
        },
      },
    ));
  });
});
