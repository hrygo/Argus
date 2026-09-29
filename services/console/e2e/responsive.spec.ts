import { test, expect, type Page } from "@playwright/test";

const AGENT_ID = "demo-banking-agent";
const LAUNCH_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const ROUTES = [
  "/launches",
  "/launches/new",
  `/launches/${LAUNCH_ID}`,
  "/agents",
  `/agents/${AGENT_ID}`,
  `/agents/${AGENT_ID}/versions/1.0.0`,
];

const agent = {
  id: AGENT_ID,
  name: "反欺诈风控助手",
  status: "active",
  version_count: 2,
  latest_version: "1.0.0",
  launch_count: 1,
  active_launch_count: 0,
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
    request_mapping: { query: "input.user_message" },
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
    request_mapping: {},
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
      items_count: 2,
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
    total: 2,
    completed: 2,
    percentage: 100,
    pending: 0,
    queued: 0,
    running: 0,
    retry_wait: 0,
    succeeded: 2,
    failed: 0,
    timed_out: 0,
    cancelled: 0,
  },
};

async function mockApi(page: Page): Promise<void> {
  await page.route("**/api/v1/system/info", (route) =>
    route.fulfill({
      json: {
        service: "argus-eval-runner",
        version: "0.2.0",
        build_id: "responsive-build",
        environment: "test",
      },
    }),
  );

  // Newest-first: concrete paths before the collection globs.
  await page.route(`**/api/v1/experiment-launches/${LAUNCH_ID}/items`, (route) =>
    route.fulfill({
      json: [
        {
          id: "item-1",
          launch_id: LAUNCH_ID,
          dataset_item_id: "case-1",
          execution_status: "SUCCEEDED",
          quality_conclusion: "pass",
          attempt_count: 1,
          dispatch_generation: 1,
          scores: { intent_match: 1 },
          final_attempt_http_status: 200,
          final_attempt_latency_ms: 120,
          execution_error: null,
          eval_error: null,
        },
      ],
    }),
  );
  await page.route(`**/api/v1/experiment-launches/${LAUNCH_ID}/summary`, (route) =>
    route.fulfill({
      json: {
        launch_id: LAUNCH_ID,
        snapshot_id: "snap-1",
        versions: { agent: { id: AGENT_ID, version: "1.0.0" } },
        classification_counts: { pass: 2, fail: 0 },
        items: [],
      },
    }),
  );
  await page.route(`**/api/v1/experiment-launches/${LAUNCH_ID}`, (route) =>
    route.fulfill({ json: launch }),
  );
  await page.route("**/api/v1/experiment-launches*", (route) =>
    route.fulfill({ json: [launch] }),
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
          items_count: 2,
        },
      ],
    }),
  );
}

/**
 * Controls that sit outside the viewport are only acceptable when a
 * scrollable ancestor can bring them into view. An `overflow: hidden`
 * ancestor makes the control unreachable: it is still in the accessibility
 * tree, still focusable by tab, and still announced — but a pointer or touch
 * user can never activate it.
 */
async function unreachableControls(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const found: string[] = [];
    for (const el of Array.from(
      document.querySelectorAll<HTMLElement>("button, a, input, select, textarea"),
    )) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.right <= vw + 1) continue;

      let scrollable = false;
      let clipped = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const overflowX = getComputedStyle(p).overflowX;
        if (/auto|scroll/.test(overflowX)) {
          scrollable = true;
          break;
        }
        if (/hidden|clip/.test(overflowX)) {
          clipped = true;
          break;
        }
      }
      if (clipped && !scrollable) {
        const label =
          el.getAttribute("aria-label") ??
          el.getAttribute("title") ??
          (el.textContent ?? "").trim();
        found.push(`<${el.tagName.toLowerCase()}> ${label.slice(0, 40)}`);
      }
    }
    return found;
  });
}

test.describe("narrow viewports", () => {
  test.beforeEach(async ({ page }) => {
    await mockApi(page);
  });

  for (const width of [390, 768]) {
    for (const routePath of ROUTES) {
      test(`${routePath} keeps every control reachable at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(routePath);
        await page.waitForLoadState("networkidle");

        expect(
          await unreachableControls(page),
          `${routePath} at ${width}px has controls clipped out of reach`,
        ).toEqual([]);
      });
    }
  }

  for (const routePath of ROUTES) {
    test(`${routePath} does not scroll the page sideways at 390px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(routePath);
      await page.waitForLoadState("networkidle");

      // Wide tables are fine as long as they scroll inside their own
      // container; a sideways-scrolling page loses the sidebar and the
      // header, which do not scroll with it.
      const overflowX = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      expect(
        overflowX,
        `${routePath} scrolls sideways at 390px`,
      ).toBeLessThanOrEqual(1);
    });
  }
});
