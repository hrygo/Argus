import React, { forwardRef, useId } from "react";
import clsx from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "warning"
  | "warning-solid"
  | "quiet";

export const buttonClassName = (variant: ButtonVariant = "secondary", className?: string) =>
  clsx("ui-button", `ui-button--${variant}`, className);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", type = "button", className, ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClassName(variant, className)} {...props} />
  ),
);
Button.displayName = "Button";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={clsx("ui-control", className)} {...props} />,
);
TextInput.displayName = "TextInput";

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={clsx("ui-control", className)} {...props} />,
);
SelectInput.displayName = "SelectInput";

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={clsx("ui-control ui-control--multiline", className)} {...props} />,
);
TextArea.displayName = "TextArea";

export interface PageHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, className, ...props }) => (
  <div className={clsx("ui-page-header", className)} {...props}>
    <div className="min-w-0">
      <h1 className="ui-page-title">{title}</h1>
      {description && <p className="ui-page-description">{description}</p>}
    </div>
    {actions && <div className="ui-page-actions">{actions}</div>}
  </div>
);

export const Panel = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => <section ref={ref} className={clsx("ui-panel", className)} {...props} />,
);
Panel.displayName = "Panel";

export interface FieldRenderProps {
  /** Id to place on the control so the label is programmatically bound. */
  id: string;
  "aria-describedby"?: string;
}

export interface FieldProps {
  label: React.ReactNode;
  /** Rendered inline after the label text, e.g. a `FieldHelp` trigger. */
  labelSuffix?: React.ReactNode;
  /** Extra guidance rendered under the control and wired via aria-describedby. */
  hint?: React.ReactNode;
  /**
   * Marks the field required. The asterisk is `aria-hidden` because the
   * control's own `required` attribute is what assistive tech announces;
   * announcing it twice makes the label read "required, star, name".
   */
  required?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => React.ReactNode;
}

/**
 * Label + control + hint, with the association generated rather than typed.
 *
 * Every form in the console previously wrote its `<label>` as a sibling of the
 * control, which leaves the label bound to nothing: clicking it does not focus
 * the field and a screen reader announces an unlabelled edit. Passing `htmlFor`
 * by hand does not survive refactors, so the id is generated and handed to the
 * control instead.
 */
export const Field: React.FC<FieldProps> = ({
  label,
  labelSuffix,
  hint,
  required,
  className,
  children,
}) => {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label htmlFor={id} className="text-xs font-semibold text-foreground-secondary">
          {label}
          {required && (
            <span className="text-fail" aria-hidden="true">
              {" "}
              *
            </span>
          )}
        </label>
        {labelSuffix}
      </div>
      {children({ id, "aria-describedby": hintId })}
      {hint && (
        <p id={hintId} className="text-micro text-muted-foreground mt-1">
          {hint}
        </p>
      )}
    </div>
  );
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Required. An icon-only control has no text for a screen reader to fall
   * back on, so the name cannot be optional — that is exactly how the five
   * close buttons in the console ended up announcing as "button".
   */
  label: string;
  tone?: "quiet" | "danger";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, tone = "quiet", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={clsx("ui-icon-button", `ui-icon-button--${tone}`, className)}
      {...props}
    />
  ),
);
IconButton.displayName = "IconButton";
