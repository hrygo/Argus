import React, { forwardRef } from "react";
import clsx from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "quiet";

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
