import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Field, IconButton, TextInput } from "../ui/Primitives";

describe("Field", () => {
  it("binds the label to the control it renders", () => {
    render(
      <Field label="Environment">
        {({ id }) => <TextInput id={id} defaultValue="production" />}
      </Field>,
    );
    // getByLabelText only resolves when htmlFor and id actually match, which
    // is the association every hand-written label in the console was missing.
    const input = screen.getByLabelText("Environment");
    expect(input).toHaveValue("production");
  });

  it("wires the hint through aria-describedby", () => {
    render(
      <Field label="并发数" hint="推荐 1~3。">
        {({ id, ...aria }) => <TextInput {...aria} id={id} />}
      </Field>,
    );
    expect(screen.getByLabelText("并发数")).toHaveAccessibleDescription("推荐 1~3。");
  });

  it("marks the control invalid and describes it with the error", () => {
    render(
      <Field label="版本号" error="版本号为必填项。">
        {({ id, ...aria }) => <TextInput {...aria} id={id} />}
      </Field>,
    );
    const input = screen.getByLabelText("版本号");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("版本号为必填项。");
  });

  it("keeps the hint readable alongside the error", () => {
    render(
      <Field label="并发数" hint="推荐 1~3。" error="必须为正整数。">
        {({ id, ...aria }) => <TextInput {...aria} id={id} />}
      </Field>,
    );
    // Both ids have to reach the control: dropping the hint on error would
    // silence real guidance exactly when the user is already stuck.
    const input = screen.getByLabelText("并发数");
    const describedBy = input.getAttribute("aria-describedby") ?? "";
    expect(describedBy.split(/\s+/).filter(Boolean)).toHaveLength(2);
    expect(input).toHaveAccessibleDescription(/推荐 1~3。/);
    expect(input).toHaveAccessibleDescription(/必须为正整数。/);
  });

  it("announces the error when it appears", () => {
    const { rerender } = render(
      <Field label="版本号">{({ id }) => <TextInput id={id} />}</Field>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    rerender(
      <Field label="版本号" error="版本号为必填项。">
        {({ id }) => <TextInput id={id} />}
      </Field>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("版本号为必填项。");
  });

  it("leaves the control unmarked when there is no error", () => {
    render(
      <Field label="Endpoint">{({ id }) => <TextInput id={id} />}</Field>,
    );
    expect(screen.getByLabelText("Endpoint")).not.toHaveAttribute("aria-invalid");
  });

  it("generates distinct ids for sibling fields", () => {
    render(
      <>
        <Field label="A">{({ id }) => <TextInput id={id} />}</Field>
        <Field label="B">{({ id }) => <TextInput id={id} />}</Field>
      </>,
    );
    expect(screen.getByLabelText("A").id).not.toBe(screen.getByLabelText("B").id);
  });

  it("keeps the required asterisk out of the accessible name", () => {
    render(
      <Field label="Endpoint" required>
        {({ id }) => <TextInput id={id} required />}
      </Field>,
    );
    // The control's own `required` attribute is what gets announced; a second
    // "star" in the name would make the label read "required, star, Endpoint".
    expect(screen.getByLabelText(/Endpoint/)).toBeRequired();
  });
});

describe("IconButton", () => {
  it("exposes its label to assistive tech and as a tooltip", () => {
    render(
      <IconButton label="关闭">
        <svg aria-hidden="true" />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "关闭" });
    expect(button).toHaveAttribute("title", "关闭");
  });

  it("fires the handler", () => {
    const onClick = vi.fn();
    render(<IconButton label="关闭" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to type=button so it cannot submit a form by accident", () => {
    render(<IconButton label="关闭" />);
    expect(screen.getByRole("button", { name: "关闭" })).toHaveAttribute("type", "button");
  });
});
