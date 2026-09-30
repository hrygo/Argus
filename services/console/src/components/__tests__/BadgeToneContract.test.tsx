import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";
import { QualityBadge } from "../QualityBadge";
import { SyncStatusBadge } from "../SyncStatusBadge";

const toneOf = (testId: string) => screen.getByTestId(testId).getAttribute("data-tone");

describe("Badge tone contract", () => {
  // A launch that is merely waiting to run must not look like one that has
  // degraded. Before this contract, PENDING and TIMED_OUT both rendered as
  // `warning`, so a reviewer could not tell normal waiting from a problem.
  it("distinguishes every execution status in the lifecycle", () => {
    const cases: Array<[string, string]> = [
      ["PENDING", "queued"],
      ["QUEUED", "queued"],
      ["RUNNING", "running"],
      ["CANCELLING", "cancelled"],
      ["SUCCEEDED", "pass"],
      ["COMPLETED", "pass"],
      ["FAILED", "fail"],
      ["PARTIAL_FAILED", "fail"],
      ["PARTIAL", "timeout"],
      ["TIMED_OUT", "timeout"],
      ["RETRY_WAIT", "retry"],
      ["CANCELLED", "cancelled"],
      ["SOMETHING_NEW", "neutral"],
    ];

    for (const [status, tone] of cases) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(toneOf("status-badge"), `status ${status}`).toBe(tone);
      unmount();
    }
  });

  it("never renders a waiting state with a degradation tone", () => {
    for (const status of ["PENDING", "QUEUED", "RETRY_WAIT"]) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(["timeout", "fail"]).not.toContain(toneOf("status-badge"));
      unmount();
    }
  });

  it("keeps quality conclusion on its own scale", () => {
    const { unmount } = render(<QualityBadge quality="PASS" />);
    expect(toneOf("quality-badge")).toBe("pass");
    unmount();

    const failed = render(<QualityBadge quality="FAIL" />);
    expect(toneOf("quality-badge")).toBe("fail");
    failed.unmount();

    render(<QualityBadge quality="UNKNOWN" />);
    expect(toneOf("quality-badge")).toBe("neutral");
  });

  it("maps sync status onto the same scale", () => {
    const cases: Array<[string, string]> = [
      ["SYNCED", "pass"],
      ["FAILED", "fail"],
      ["SYNCING", "running"],
      ["PENDING", "queued"],
      ["NOT_APPLICABLE", "neutral"],
      ["WAITING", "neutral"],
    ];
    for (const [status, tone] of cases) {
      const { unmount } = render(<SyncStatusBadge status={status} />);
      expect(toneOf("sync-status-badge"), `sync ${status}`).toBe(tone);
      unmount();
    }
  });

  // WCAG 2.2 SC 1.4.1 Use of Color. The tone is a redundant channel: the
  // label is the one that has to survive greyscale print and colour-vision
  // differences, so an empty badge is a conformance failure, not a cosmetic
  // one.
  it("always carries a text label, never colour alone", () => {
    const statuses = [
      "PENDING",
      "QUEUED",
      "RUNNING",
      "CANCELLING",
      "SUCCEEDED",
      "FAILED",
      "PARTIAL_FAILED",
      "PARTIAL",
      "TIMED_OUT",
      "RETRY_WAIT",
      "CANCELLED",
      "SOMETHING_NEW",
    ];
    for (const status of statuses) {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByTestId("status-badge").textContent?.trim(), status).not.toBe(
        "",
      );
      unmount();
    }

    for (const quality of ["PASS", "FAIL", "UNKNOWN"]) {
      const { unmount } = render(<QualityBadge quality={quality} />);
      expect(
        screen.getByTestId("quality-badge").textContent?.trim(),
        quality,
      ).not.toBe("");
      unmount();
    }
  });
});
