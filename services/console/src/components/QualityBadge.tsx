import React from "react";
import { Badge, type BadgeTone } from "./Badge";

export type QualityConclusion = "pass" | "fail" | "unknown" | string;

interface QualityBadgeProps {
  quality: QualityConclusion;
  className?: string;
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({ quality, className = "" }) => {
  const normalized = (quality || "unknown").toLowerCase();
  const tone: BadgeTone = normalized === "pass" ? "pass" : normalized === "fail" ? "fail" : "neutral";
  const label = normalized === "pass" ? "PASS" : normalized === "fail" ? "FAIL" : "UNKNOWN";

  return <Badge tone={tone} data-testid="quality-badge" data-tone={tone} className={className}>{label}</Badge>;
};
