import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "../StatusBadge";
import { QualityBadge } from "../QualityBadge";
import { SyncStatusBadge } from "../SyncStatusBadge";

describe("Execution Status vs Quality Conclusion Semantic Decoupling", () => {
  it("applies the mapped tone classes to execution, quality, and sync badges", () => {
    const { rerender } = render(<StatusBadge status="RUNNING" />);
    expect(screen.getByTestId("status-badge")).toHaveClass("ui-badge--running");
    rerender(<StatusBadge status="COMPLETED" />);
    expect(screen.getByTestId("status-badge")).toHaveClass("ui-badge--pass");
    rerender(<StatusBadge status="FAILED" />);
    expect(screen.getByTestId("status-badge")).toHaveClass("ui-badge--fail");
    rerender(<StatusBadge status="PENDING" />);
    expect(screen.getByTestId("status-badge")).toHaveClass("ui-badge--queued");
    rerender(<StatusBadge status="CANCELLED" />);
    expect(screen.getByTestId("status-badge")).toHaveClass("ui-badge--cancelled");

    rerender(<QualityBadge quality="PASS" />);
    expect(screen.getByTestId("quality-badge")).toHaveClass("ui-badge--pass");
    rerender(<QualityBadge quality="FAIL" />);
    expect(screen.getByTestId("quality-badge")).toHaveClass("ui-badge--fail");
    rerender(<QualityBadge quality="UNKNOWN" />);
    expect(screen.getByTestId("quality-badge")).toHaveClass("ui-badge--neutral");

    rerender(<SyncStatusBadge status="SYNCED" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveClass("ui-badge--pass");
    rerender(<SyncStatusBadge status="FAILED" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveClass("ui-badge--fail");
    rerender(<SyncStatusBadge status="SYNCING" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveClass("ui-badge--running");
    rerender(<SyncStatusBadge status="PENDING" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveClass("ui-badge--queued");
    rerender(<SyncStatusBadge status="WAITING" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveClass("ui-badge--neutral");
  });

  it("StatusBadge correctly renders SUCCEEDED execution status", () => {
    const { container } = render(<StatusBadge status="SUCCEEDED" />);
    expect(screen.getByText("SUCCEEDED")).toBeInTheDocument();
    // Verify it doesn't mention "PASS" or "质量通过"
    expect(screen.queryByText("PASS")).not.toBeInTheDocument();
    expect(screen.queryByText("质量通过")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "pass");
  });

  it("StatusBadge correctly renders FAILED execution status", () => {
    render(<StatusBadge status="FAILED" />);
    expect(screen.getByText("FAILED")).toBeInTheDocument();
    expect(screen.queryByText("FAIL")).not.toBeInTheDocument();
  });

  it("StatusBadge renders unknown statuses gracefully", () => {
    render(<StatusBadge status="CUSTOM_STATUS" />);
    expect(screen.getByText("CUSTOM_STATUS")).toBeInTheDocument();
  });

  it("StatusBadge correctly renders S2 lifecycle statuses", () => {
    const { rerender, container } = render(<StatusBadge status="QUEUED" />);
    expect(screen.getByText("QUEUED")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "queued");

    rerender(<StatusBadge status="PARTIAL_FAILED" />);
    expect(screen.getByText("PARTIAL_FAILED")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "fail");

    rerender(<StatusBadge status="RETRY_WAIT" />);
    expect(screen.getByText("RETRY_WAIT")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "retry");

    rerender(<StatusBadge status="CANCELLED" />);
    expect(screen.getByText("CANCELLED")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "cancelled");
  });

  it("QualityBadge correctly renders PASS quality conclusion", () => {
    const { container } = render(<QualityBadge quality="PASS" />);
    expect(screen.getByText("PASS")).toBeInTheDocument();
    // Verify it does not mention "SUCCEEDED"
    expect(screen.queryByText("SUCCEEDED")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "pass");
  });

  it("QualityBadge correctly renders FAIL quality conclusion", () => {
    const { container } = render(<QualityBadge quality="FAIL" />);
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(screen.queryByText("FAILED")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-tone", "fail");
  });

  it("QualityBadge correctly renders UNKNOWN quality conclusion", () => {
    render(<QualityBadge quality="UNKNOWN" />);
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });

  it("maps sync status independently and renders unknown sync values neutrally", () => {
    const { rerender } = render(<SyncStatusBadge status="SYNCED" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-tone", "pass");
    rerender(<SyncStatusBadge status="FAILED" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-tone", "fail");
    rerender(<SyncStatusBadge status="SYNCING" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-tone", "running");
    rerender(<SyncStatusBadge status="NOT_APPLICABLE" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-tone", "neutral");
    rerender(<SyncStatusBadge status="PENDING" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-tone", "queued");
    rerender(<SyncStatusBadge status="WAITING" />);
    expect(screen.getByTestId("sync-status-badge")).toHaveAttribute("data-tone", "neutral");
  });

  it("Guarantees that a SUCCEEDED execution does NOT imply PASS quality badge", () => {
    render(
      <div data-testid="dual-container">
        <StatusBadge status="SUCCEEDED" />
        <QualityBadge quality="FAIL" />
      </div>
    );
    // Even if execution SUCCEEDED, quality can independently be FAIL
    expect(screen.getByText("SUCCEEDED")).toBeInTheDocument();
    expect(screen.getByText("FAIL")).toBeInTheDocument();
  });
});
