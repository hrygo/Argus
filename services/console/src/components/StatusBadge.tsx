import React from "react";
import { Badge, type BadgeTone } from "./Badge";

export type ExecutionStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;

interface StatusBadgeProps {
  status: ExecutionStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const normalized = status.toUpperCase();
  let tone: BadgeTone = "neutral";

  if (normalized === "SUCCEEDED" || normalized === "COMPLETED") tone = "success";
  else if (normalized === "FAILED") tone = "danger";
  else if (normalized === "PARTIAL_FAILED" || normalized === "PARTIAL" || normalized === "PENDING" || normalized === "RETRY_WAIT" || normalized === "TIMED_OUT") tone = "warning";
  else if (normalized === "RUNNING" || normalized === "QUEUED" || normalized === "CANCELLING") tone = "info";

  return <Badge tone={tone} data-testid="status-badge" data-tone={tone} className={className}>{normalized}</Badge>;
};
