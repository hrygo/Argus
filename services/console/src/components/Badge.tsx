import React from "react";
import clsx from "clsx";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "ui-badge--neutral",
  info: "ui-badge--info",
  success: "ui-badge--success",
  warning: "ui-badge--warning",
  danger: "ui-badge--danger",
};

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }> = ({
  tone = "neutral",
  className,
  ...props
}) => <span className={clsx("ui-badge", toneClasses[tone], className)} {...props} />;
