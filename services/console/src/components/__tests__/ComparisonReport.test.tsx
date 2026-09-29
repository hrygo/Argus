import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ComparisonReport } from "../../features/launches/ComparisonReport";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

const summaryFor = (snapshotId: string) => ({
  launch_id: "candidate-launch",
  snapshot_id: snapshotId,
  revision: snapshotId.endsWith("new") ? 2 : 1,
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
    pass_rate: 0.8,
    evaluation_coverage: 0.8,
    total_cases: 10,
    evaluated_cases: 8,
    critical_failure_count: 0,
    execution_error_count: 1,
    execution_error_rate: 0.1,
    evaluator_error_count: 1,
    p95_latency_ms: 120,
    cost_per_case: null,
  },
  langfuse_score_sync_status: "SYNCED",
});

const metrics = (overrides: Record<string, unknown> = {}) => ({
  pass_rate: 1,
  evaluation_coverage: 1,
  total_cases: 10,
  evaluated_cases: 10,
  critical_failure_count: 0,
  execution_error_count: 0,
  execution_error_rate: 0,
  evaluator_error_count: 0,
  p95_latency_ms: 120,
  cost_per_case: null,
  score_means: { correctness: 0.9 },
  ...overrides,
});

const comparisonPage = (snapshotId: string, caseId: string, nextCursor: number | null) => ({
  launch_id: "candidate-launch",
  candidate_snapshot_id: snapshotId,
  baseline_snapshot_id: "baseline-snapshot",
  baseline_binding_revision: 3,
  versions: {
    candidate: summaryFor(snapshotId).versions,
    baseline: {
      ...summaryFor(snapshotId).versions,
      agent: { id: "banking-agent", version: "2.3.0" },
    },
  },
  summary: {
    comparable_case_count: 8,
    baseline: metrics(),
    candidate: metrics({
      pass_rate: 0.8,
      evaluation_coverage: 0.8,
      evaluated_cases: 8,
      execution_error_count: 1,
      execution_error_rate: 0.1,
      evaluator_error_count: 1,
    }),
    comparable_cohort: {
      baseline: metrics(),
      candidate: metrics({ pass_rate: 0.8, score_means: { correctness: 0.8 } }),
    },
  },
  classification_counts: { REGRESSION: 1, IMPROVEMENT: 1, UNCHANGED: 0, NOT_COMPARABLE: 0 },
  items: [{
    dataset_item_id: caseId,
    classification: "REGRESSION",
    reason: "SCORE_CHANGED",
    baseline_scores: { correctness: 0.9 },
    candidate_scores: { correctness: 0.7 },
    score_deltas: { correctness: -0.2 },
    baseline_trace_url: "https://langfuse.example/trace-baseline",
    candidate_trace_url: "https://langfuse.example/trace-candidate",
    baseline_experiment_url: "https://langfuse.example/experiment-baseline",
    candidate_experiment_url: "https://langfuse.example/experiment-candidate",
  }],
  next_cursor: nextCursor,
});

const caseOutput = (snapshotId: string) => ({
  launch_id: "candidate-launch",
  candidate_snapshot_id: snapshotId,
  baseline_snapshot_id: "baseline-snapshot",
  dataset_item_id: "case-1",
  classification: "REGRESSION",
  reason: "SCORE_CHANGED",
  baseline: { output_status: "AVAILABLE", output: { answer: "base" }, scores: { correctness: 0.9 }, retryable: false, truncated: false, trace_url: "https://langfuse.example/trace-baseline" },
  candidate: { output_status: "FETCH_FAILED", output: null, reason: "UPSTREAM_ERROR", scores: { correctness: 0.7 }, retryable: true, truncated: false, trace_url: "https://langfuse.example/trace-candidate" },
});

describe("ComparisonReport", () => {
  let queryClient: QueryClient;
  let latestSummaryReads: number;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
    latestSummaryReads = 0;
    window.history.replaceState({}, "", "/launches/candidate-launch");
    (api.GET as any).mockImplementation((path: string, options: any) => {
      if (path.endsWith("/summary")) {
        const requested = options.params.query.snapshot_id;
        if (requested) return Promise.resolve({ data: summaryFor(requested) });
        latestSummaryReads += 1;
        return Promise.resolve({ data: summaryFor(latestSummaryReads > 1 ? "candidate-snapshot-new" : "candidate-snapshot") });
      }
      if (path.includes("/baselines")) {
        return Promise.resolve({ error: {}, response: { status: 404 } });
      }
      if (path.endsWith("/comparison/case")) {
        return Promise.resolve({ data: caseOutput(options.params.query.snapshot_id) });
      }
      if (path.endsWith("/comparison")) {
        const { cursor, snapshot_id: snapshotId } = options.params.query;
        return Promise.resolve({
          data: cursor === 0 ? comparisonPage(snapshotId, "case-1", 1) : comparisonPage(snapshotId, "case-2", null),
        });
      }
      return Promise.resolve({ data: null });
    });
    (api.POST as any).mockResolvedValue({ data: { revision: 4 } });
  });

  const renderReport = (launchStatus = "COMPLETED") => render(
    <QueryClientProvider client={queryClient}>
      <ComparisonReport launchId="candidate-launch" launchStatus={launchStatus} environment="production" />
    </QueryClientProvider>,
  );

  it("pins the first revision in the URL and sends it on every comparison page", async () => {
    renderReport();

    expect(await screen.findByRole("table", { name: "Baseline 与 Candidate 聚合指标对比" })).toBeInTheDocument();
    expect(window.location.search).toBe("?snapshot_id=candidate-snapshot");
    expect(screen.getByText("banking-agent@2.3.0")).toBeInTheDocument();
    expect(screen.getByText("banking-agent@2.4.0")).toBeInTheDocument();
    expect(within(screen.getByRole("table", { name: "Baseline 与 Candidate 聚合指标对比" })).getByText("-20.0 pp")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Baseline Experiment/ })).toHaveAttribute(
      "href",
      "https://langfuse.example/experiment-baseline",
    );
    expect(screen.getByRole("link", { name: /Candidate Trace/ })).toHaveAttribute(
      "href",
      "https://langfuse.example/trace-candidate",
    );
    expect(screen.getByRole("table", { name: "Baseline 与 Candidate 全量运行健康指标" })).toHaveTextContent("80.0%");
    expect(screen.getByRole("table", { name: "Baseline 与 Candidate 全量运行健康指标" })).toHaveTextContent("1");

    fireEvent.click(screen.getByRole("button", { name: "加载更多用例（已显示 1 条）" }));
    expect(await screen.findByText("case-2")).toBeInTheDocument();
    await waitFor(() => {
      const comparisonCalls = (api.GET as any).mock.calls.filter((call: any[]) => call[0].endsWith("/comparison"));
      expect(comparisonCalls.length).toBeGreaterThanOrEqual(2);
      expect(comparisonCalls.every((call: any[]) => call[1].params.query.snapshot_id === "candidate-snapshot")).toBe(true);
    });
  });

  it("loads an explicitly pinned historical snapshot while a retry is running", async () => {
    window.history.replaceState({}, "", "/launches/candidate-launch?snapshot_id=old-snapshot");
    renderReport("RUNNING");

    expect(await screen.findByRole("button", { name: "查看双侧输出" })).toBeInTheDocument();
    expect((api.GET as any).mock.calls.some((call: any[]) => (
      call[0].endsWith("/summary") && call[1].params.query.snapshot_id === "old-snapshot"
    ))).toBe(true);
    expect((api.GET as any).mock.calls.some((call: any[]) => (
      call[0].endsWith("/comparison") && call[1].params.query.snapshot_id === "old-snapshot"
    ))).toBe(true);
  });

  it("binds the currently displayed snapshot as the environment baseline", async () => {
    renderReport();
    await screen.findByRole("table", { name: "Baseline 与 Candidate 聚合指标对比" });
    await waitFor(() => expect(window.location.search).toBe("?snapshot_id=candidate-snapshot"));
    const setBaselineButton = await screen.findByRole("button", { name: "设为当前环境 Baseline" });
    await waitFor(() => expect(setBaselineButton).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "设为当前环境 Baseline" }));
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

  it("explicitly switches to the latest snapshot and replaces the URL revision", async () => {
    renderReport();
    expect(await screen.findByRole("button", { name: "查看最新修订" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看最新修订" }));
    await waitFor(() => expect(window.location.search).toBe("?snapshot_id=candidate-snapshot-new"));
    await waitFor(() => expect((api.GET as any).mock.calls.some((call: any[]) => (
      call[0].endsWith("/comparison") && call[1].params.query.snapshot_id === "candidate-snapshot-new"
    ))).toBe(true));
  });

  it("loads case output from the pinned snapshot and restores focus on Escape", async () => {
    renderReport();
    await screen.findByText("case-1");
    fireEvent.click(screen.getByRole("button", { name: "加载更多用例（已显示 1 条）" }));
    expect(await screen.findByText("case-2")).toBeInTheDocument();
    const trigger = screen.getAllByRole("button", { name: "查看双侧输出" })[0];
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Case 双侧结果" });
    expect(await screen.findByText("UPSTREAM_ERROR")).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Baseline");
    expect(dialog).toHaveTextContent("Candidate");
    expect((api.GET as any).mock.calls.some((call: any[]) => (
      call[0].endsWith("/comparison/case") && call[1].params.query.snapshot_id === "candidate-snapshot"
    ))).toBe(true);

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
