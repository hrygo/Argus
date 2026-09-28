import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, PageHeader, Panel, SelectInput, TextArea, TextInput } from "../ui/Primitives";

describe("Console visual primitives", () => {
  it("defaults buttons to non-submit and exposes a visible disabled state", () => {
    render(<Button disabled>Saving</Button>);
    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    expect(button).toHaveClass("ui-button", "ui-button--primary");
  });

  it("allows explicit submit buttons without changing native form behavior", () => {
    render(<Button type="submit" variant="danger">Delete</Button>);
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("ui-button--danger");
  });

  it("provides a distinct warning treatment for retry actions", () => {
    render(<Button variant="warning">Retry</Button>);
    expect(screen.getByRole("button", { name: "Retry" })).toHaveClass("ui-button--warning");
  });

  it("gives text, select and multiline controls the shared accessible focus style", () => {
    render(
      <>
        <TextInput aria-label="Agent name" />
        <SelectInput aria-label="Status"><option>All</option></SelectInput>
        <TextArea aria-label="Description" />
      </>,
    );
    for (const control of [
      screen.getByRole("textbox", { name: "Agent name" }),
      screen.getByRole("combobox", { name: "Status" }),
      screen.getByRole("textbox", { name: "Description" }),
    ]) {
      expect(control).toHaveClass("ui-control");
    }
  });

  it("renders a page heading and neutral bordered panel with semantic structure", () => {
    render(
      <>
        <PageHeader title="Agents" description="Registered business agents" />
        <Panel aria-label="Agent summary">Summary</Panel>
      </>,
    );
    expect(screen.getByRole("heading", { name: "Agents", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Registered business agents")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Agent summary" })).toHaveClass("ui-panel");
  });
});
