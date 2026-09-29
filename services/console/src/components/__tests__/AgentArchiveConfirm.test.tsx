import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AgentDetail } from "../../features/agents/AgentDetail";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    GET: vi.fn(),
    POST: vi.fn(),
    DELETE: vi.fn(),
  },
}));

const agent = {
  id: "archive-agent",
  name: "归档测试 Agent",
  description: "",
  owner: "",
  status: "ACTIVE",
  version_count: 1,
  latest_version: "v1",
  launch_count: 0,
  active_launch_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const activeVersion = {
  id: "ver-1",
  agent_id: "archive-agent",
  version: "v1",
  spec_digest: "sha256:abc",
  endpoint: "https://example.invalid/invoke",
  protocol: "http",
  method: "POST",
  request_mapping: {},
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
};

const renderDetail = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/agents/archive-agent"]}>
        <Routes>
          <Route path="/agents/:agentId" element={<AgentDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("Agent version archive confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.GET as any).mockImplementation((path: string) => {
      if (path === "/api/v1/agent-versions") {
        return Promise.resolve({ data: [activeVersion] });
      }
      return Promise.resolve({ data: [agent] });
    });
    (api.POST as any).mockResolvedValue({ data: { archived: true } });
  });

  it("does not archive until the confirmation is accepted", async () => {
    renderDetail();

    const archiveBtn = await screen.findByRole("button", { name: /归档/ });
    fireEvent.click(archiveBtn);

    // A dialog must gate the destructive call. `window.confirm` is synchronous
    // and cannot be styled, labelled or focus-trapped like the rest of the app.
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(api.POST).not.toHaveBeenCalled();

    const confirmBtn = within(dialog).getByRole("button", { name: "确认归档" });
    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(api.POST).toHaveBeenCalledWith("/api/v1/agent-versions/archive", {
        body: { agent_id: "archive-agent", version: "v1" },
      }),
    );
  });

  it("leaves the version untouched when the confirmation is dismissed", async () => {
    renderDetail();

    const archiveBtn = await screen.findByRole("button", { name: /归档/ });
    fireEvent.click(archiveBtn);

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "取消" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(api.POST).not.toHaveBeenCalled();
  });
});
