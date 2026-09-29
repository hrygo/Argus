import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Modal, SideDrawer } from "../ui/Overlay";

afterEach(() => {
  document.body.style.overflow = "";
});

const Body = () => (
  <>
    <p>内容</p>
  </>
);

describe("Modal", () => {
  it("exposes itself as a named modal dialog", () => {
    render(
      <Modal open onClose={() => {}} title="删除 Agent">
        <Body />
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // The visible heading is what names the dialog; an unnamed modal is
    // announced only as "dialog".
    expect(dialog).toHaveAccessibleName("删除 Agent");
  });

  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onClose={() => {}} title="删除 Agent">
        <Body />
      </Modal>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="删除 Agent">
        <Body />
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("ignores Escape and backdrop clicks while not dismissable", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="删除 Agent" dismissable={false}>
        <Body />
      </Modal>,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when the backdrop is clicked but not the panel", () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="删除 Agent">
        <Body />
      </Modal>,
    );
    const backdrop = screen.getByRole("dialog").parentElement!;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledOnce();

    onClose.mockClear();
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks page scroll while open and restores it on close", () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>打开</button>
          <Modal open={open} onClose={() => setOpen(false)} title="删除 Agent">
            <Body />
          </Modal>
        </>
      );
    };
    render(<Harness />);
    fireEvent.click(screen.getByText("打开"));
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("focus management", () => {
  it("moves focus into the panel on open and restores it on close", () => {
    const Harness = () => {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>打开</button>
          <Modal open={open} onClose={() => setOpen(false)} title="删除 Agent">
            <button>确认</button>
          </Modal>
        </>
      );
    };
    render(<Harness />);
    const trigger = screen.getByText("打开");
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "确认" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    // Without this, dismissing a dialog drops focus on <body> and keyboard
    // users restart at the top of the page.
    expect(trigger).toHaveFocus();
  });

  it("cycles Tab within the panel instead of escaping to the page behind", () => {
    render(
      <>
        <button>页面上的按钮</button>
        <Modal open onClose={() => {}} title="删除 Agent">
          <button>第一个</button>
          <button>最后一个</button>
        </Modal>
      </>,
    );
    const last = screen.getByRole("button", { name: "最后一个" });
    // The header close button is still inside the trap; it is simply not
    // where focus starts.
    const first = screen.getByRole("button", { name: "关闭" });
    last.focus();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("gives every close button an accessible name", () => {
    render(
      <Modal open onClose={() => {}} title="删除 Agent">
        <Body />
      </Modal>,
    );
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
  });
});

describe("SideDrawer", () => {
  it("is a named modal dialog with the same guarantees", () => {
    const onClose = vi.fn();
    render(
      <SideDrawer open onClose={onClose} title="Attempt 详情">
        <Body />
      </SideDrawer>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Attempt 详情");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
