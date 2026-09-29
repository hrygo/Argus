import React from "react";
import { Badge, type BadgeTone } from "./Badge";

interface SyncStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: string | null;
  "data-testid"?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  status,
  className,
  "data-testid": testId = "sync-status-badge",
  ...props
}) => {
  const normalized = status?.toUpperCase() || "PENDING";
  const tone: BadgeTone =
    normalized === "SYNCED"
      ? "pass"
      : normalized === "FAILED"
        ? "fail"
        : normalized === "SYNCING"
          ? "running"
          : normalized === "PENDING"
            ? "queued"
            : "neutral";

  return (
    <Badge tone={tone} data-testid={testId} data-tone={tone} className={className} {...props}>
      {normalized}
    </Badge>
  );
};
