import React from "react";
import { Badge, type BadgeTone } from "./Badge";

export type ExecutionStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;

interface StatusBadgeProps {
  status: ExecutionStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const normalized = status.toUpperCase();
  const tones: Record<string, BadgeTone> = {
    SUCCEEDED: "pass",
    COMPLETED: "pass",
    FAILED: "fail",
    PARTIAL_FAILED: "fail",
    PARTIAL: "timeout",
    TIMED_OUT: "timeout",
    RETRY_WAIT: "retry",
    RUNNING: "running",
    PENDING: "queued",
    QUEUED: "queued",
    CANCELLING: "cancelled",
    CANCELLED: "cancelled",
  };
  const tone: BadgeTone = tones[normalized] ?? "neutral";

  return <Badge tone={tone} data-testid="status-badge" data-tone={tone} className={className}>{normalized}</Badge>;
};
