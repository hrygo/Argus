import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

const AGENT_ID = "demo-banking-agent";
const LAUNCH_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const agent = {
  id: AGENT_ID,
  name: "反欺诈风控助手",
  status: "active",
  version_count: 2,
  latest_version: "1.0.0",
  created_at: "2026-09-24T00:00:00Z",
};

const versions = [
  {
    id: "ver-1",
    agent_id: AGENT_ID,
    version: "1.0.0",
    endpoint: "http://demo-agent:8080/invoke",
    is_active: true,
    is_idempotent: true,
    spec_digest: "sha256:specs987654321",
    environment: "production",
    credential_ref: "env://API_TOKEN",
    artifact_ref: "git:abc1234",
    created_at: "2026-09-24T00:00:00Z",
  },
  {
    id: "ver-0",
    agent_id: AGENT_ID,
    version: "0.9.0",
    endpoint: "http://demo-agent:8080/invoke",
    is_active: false,
    is_idempotent: false,
    spec_digest: "sha256:specs111111111",
    environment: "staging",
    credential_ref: null,
    artifact_ref: null,
    created_at: "2026-09-20T00:00:00Z",
  },
];

const launch = {
  id: LAUNCH_ID,
  name: "run-regression-suite",
  status: "COMPLETED",
  quality_conclusion: "pass",
  dataset_name: "financial-transactions-regression-benchmark-dataset-v2",
  dataset_version: "2026-09-24T00:00:00Z",
  agent_id: AGENT_ID,
  agent_version: "1.0.0",
  agent_version_id: "ver-1",
  manifest: {
    schema_version: "1.0",
    dataset: {
      dataset_name: "financial-transactions-regression-benchmark-dataset-v2",
      dataset_version: "2026-09-24T00:00:00Z",
      snapshot_digest: "sha256:e2edigest12345678",
      items_count: 6,
    },
    agent: {
      id: AGENT_ID,
      version: "1.0.0",
      endpoint: "http://demo-agent:8080/invoke",
      spec_digest: "sha256:specs987654321",
    },
    evaluators: [{ id: "intent_match", version: "1.0.0", scope: "item" }],
    execution_policy: { timeout_seconds: 30, max_retries: 2, max_concurrency: 2 },
    runner: { runner_version: "0.1.0", mapping_engine_version: "sha256-mapping-engine-v1" },
  },
  langfuse_experiment_url: null,
  langfuse_sync_status: "SYNCED",
  created_at: "2026-09-24T00:00:00Z",
  started_at: "2026-09-24T00:01:00Z",
  completed_at: "2026-09-24T00:09:00Z",
  progress: {
    total: 6,
    completed: 6,
    percentage: 100,
    pending: 0,
    queued: 0,
    running: 0,
    retry_wait: 0,
    succeeded: 4,
    failed: 1,
    timed_out: 1,
    cancelled: 0,
  },
};

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/v1/system/info", (route) =>
    route.fulfill({
      json: {
        service: "argus-eval-runner",
        version: "0.2.0",
        build_id: "a11y-build",
        environment: "test",
      },
    }),
  );

  // Playwright matches routes newest-first, so the concrete detail and item
  // paths are registered after the collection globs they would otherwise be
  // swallowed by.
  // `?id=` / `?agent_id=` query strings are part of the matched URL, so the
  // collection globs need a trailing `*` or they never fire.
  await page.route("**/api/v1/experiment-launches*", (route) =>
    route.fulfill({ json: [launch] }),
  );
  await page.route(`**/api/v1/experiment-launches/${LAUNCH_ID}/items`, (route) =>
    route.fulfill({
      json: [
        {
          id: "item-1",
          dataset_item_id: "case-1",
          status: "SUCCEEDED",
          quality_conclusion: "pass",
          attempts: 1,
        },
        {
          id: "item-2",
          dataset_item_id: "case-2",
          status: "FAILED",
          quality_conclusion: "fail",
          attempts: 2,
        },
      ],
    }),
  );
  await page.route(`**/api/v1/experiment-launches/${LAUNCH_ID}/summary`, (route) =>
    route.fulfill({
      json: {
        launch_id: LAUNCH_ID,
        snapshot_id: "snap-1",
        versions: {
          agent: { id: AGENT_ID, version: "1.0.0" },
          evaluator: { id: "intent_match", version: "1.0.0" },
        },
        classification_counts: { pass: 4, fail: 2 },
        items: [],
      },
    }),
  );
  await page.route(`**/api/v1/experiment-launches/${LAUNCH_ID}`, (route) =>
    route.fulfill({ json: launch }),
  );

  await page.route("**/api/v1/agents*", (route) => route.fulfill({ json: [agent] }));
  await page.route("**/api/v1/agent-versions*", (route) =>
    route.fulfill({ json: versions }),
  );

  await page.route("**/api/v1/datasets*", (route) =>
    route.fulfill({
      json: [
        {
          name: "financial-transactions-regression-benchmark-dataset-v2",
          version: "2026-09-24T00:00:00Z",
          items_count: 6,
        },
      ],
    }),
  );
}

async function audit(page: Page, routePath: string): Promise<void> {
  await page.goto(routePath);
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map(
      (node) =>
        `${node.target.join(" ")} :: ${(node.failureSummary ?? "").split("\n")[0] ?? ""}`,
    ),
  }));

  expect(summary, `${routePath} has WCAG 2.2 AA violations`).toEqual([]);
}

test.describe("WCAG 2.2 AA: rendered console routes", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const routePath of [
    "/launches",
    "/launches/new",
    `/launches/${LAUNCH_ID}`,
    "/agents",
    `/agents/${AGENT_ID}`,
    `/agents/${AGENT_ID}/versions/1.0.0`,
  ]) {
    test(`${routePath} has no violations`, async ({ page }) => {
      await audit(page, routePath);
    });
  }
});

async function auditOpen(page: Page, routePath: string, open: () => Promise<void>): Promise<void> {
  await page.goto(routePath);
  await page.waitForLoadState("networkidle");
  await open();
  await page.waitForTimeout(200);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();

  const summary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map(
      (node) =>
        `${node.target.join(" ")} :: ${(node.failureSummary ?? "").split("\n")[0] ?? ""}`,
    ),
  }));

  expect(summary, `${routePath} overlay has WCAG 2.2 AA violations`).toEqual([]);
}

test.describe("WCAG 2.2 AA: overlay surfaces", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  test("register-agent dialog", async ({ page }) => {
    await auditOpen(page, "/agents", () =>
      page.getByRole("button", { name: /注册 Agent/ }).first().click(),
    );
  });
});
