import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmptyState, ErrorState, LoadingState } from "../StateViews";

describe("Console state views", () => {
  it("announces loading feedback politely", () => {
    render(<LoadingState message="Loading agents" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading agents");
  });

  it("announces errors and keeps the retry action operable", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Network unavailable" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Network unavailable");
    fireEvent.click(screen.getByRole("button", { name: "重新加载" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("keeps empty-state title and optional action visible", () => {
    render(<EmptyState title="暂无 Agent" action={<button>注册 Agent</button>} />);
    expect(screen.getByRole("heading", { name: "暂无 Agent" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "注册 Agent" })).toBeInTheDocument();
  });
});
