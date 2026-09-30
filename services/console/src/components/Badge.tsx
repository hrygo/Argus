import React from "react";
import clsx from "clsx";

/**
 * Badge tones map one-to-one onto the execution status scale, so a state
 * keeps the same meaning wherever it appears — badge, meter, table or callout.
 */
export type BadgeTone = "neutral" | "queued" | "running" | "pass" | "fail" | "timeout" | "retry" | "cancelled";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "ui-badge--neutral",
  queued: "ui-badge--queued",
  running: "ui-badge--running",
  pass: "ui-badge--pass",
  fail: "ui-badge--fail",
  timeout: "ui-badge--timeout",
  retry: "ui-badge--retry",
  cancelled: "ui-badge--cancelled",
};

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }> = ({
  tone = "neutral",
  className,
  ...props
}) => <span className={clsx("ui-badge", toneClasses[tone], className)} {...props} />;
