import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RegisterAgentDialog } from "../../features/agents/RegisterAgentDialog";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    POST: vi.fn(),
  },
}));

describe("RegisterAgentDialog field-level validation", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderDialog = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <RegisterAgentDialog isOpen={true} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

  // The submit button sits in the Modal footer and reaches the form through the
  // `form` attribute, which jsdom does not resolve on click. Drive the form
  // directly; the association itself is covered end-to-end.
  const submit = () =>
    fireEvent.submit(
      document.getElementById("register-agent-form") as HTMLFormElement,
    );

  it("marks both empty required controls invalid and focuses the first", () => {
    renderDialog();
    submit();

    const agentId = screen.getByRole("textbox", { name: /Agent ID/ });
    const name = screen.getByRole("textbox", { name: /显示名称/ });

    expect(agentId).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(agentId).toHaveAccessibleDescription(/Agent ID 为必填项/);
    expect(document.activeElement).toBe(agentId);
  });

  it("does not post until both required fields are filled", async () => {
    renderDialog();
    submit();
    expect(api.POST).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole("textbox", { name: /Agent ID/ }), {
      target: { value: "banking-agent" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: /显示名称/ }), {
      target: { value: "银行核心业务助手" },
    });
    submit();

    // `mutate()` schedules the mutation; the request itself is async, so
    // asserting synchronously would race the call.
    await waitFor(() => expect(api.POST).toHaveBeenCalled());
  });

  it("clears one field's error without touching the other", () => {
    renderDialog();
    submit();

    fireEvent.change(screen.getByRole("textbox", { name: /Agent ID/ }), {
      target: { value: "banking-agent" },
    });

    expect(screen.getByRole("textbox", { name: /Agent ID/ })).not.toHaveAttribute(
      "aria-invalid",
    );
    expect(screen.getByRole("textbox", { name: /显示名称/ })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
