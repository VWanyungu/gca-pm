export type RiskStatus = "open" | "mitigated" | "closed" | "dismissed" | "auto_resolved";
export type RiskKind = "risk" | "issue";
export type RiskSource = "manual" | "overdue_task";
export type RiskRating = "low" | "medium" | "high";

export interface RiskCategory {
  risk_category_id: number;
  code: string;
  name: string;
  is_system: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface Risk {
  risk_id: string;
  project_id: string;
  stage_no: number | null;
  title: string;
  description: string | null;
  category_id: number;
  likelihood: number | null;
  impact: number;
  score: number;
  owner_id: string;
  /** Only returned by the single-risk endpoint, not the list. */
  owner_name?: string | null;
  mitigation: string | null;
  review_by: string | null;
  status: RiskStatus;
  dismissal_reason: string | null;
  source: RiskSource;
  kind: RiskKind;
  opened_at: string;
  closed_at: string | null;
  created_by: string;
  updated_at: string;
}

export function ratingFromScore(score: number): { label: string; className: string } {
  if (score >= 15) return { label: "High", className: "text-error-text" };
  if (score >= 8) return { label: "Medium", className: "text-gca-warning" };
  return { label: "Low", className: "text-gca-muted" };
}

export function statusInfo(risk: Pick<Risk, "status" | "source">): {
  label: string;
  className: string;
} {
  if (risk.source === "overdue_task") {
    if (risk.status === "open") return { label: "Unaddressed", className: "text-error-text" };
    if (risk.status === "mitigated") return { label: "Addressed", className: "text-gca-green" };
  }
  switch (risk.status) {
    case "open":
      return { label: "Open", className: "text-gca-dark" };
    case "mitigated":
      return { label: "Addressed", className: "text-gca-green" };
    case "closed":
      return { label: "Closed", className: "text-gca-muted" };
    case "dismissed":
      return { label: "Dismissed", className: "text-gca-muted" };
    case "auto_resolved":
      return { label: "Auto-resolved", className: "text-gca-muted" };
  }
}

export const STATUS_TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
  open: ["mitigated", "closed", "dismissed"],
  mitigated: ["open", "closed"],
  closed: ["open"],
  dismissed: ["open"],
  auto_resolved: [],
};

export const STATUS_OPTION_LABEL: Record<RiskStatus, string> = {
  open: "Open",
  mitigated: "Addressed",
  closed: "Closed",
  dismissed: "Dismissed",
  auto_resolved: "Auto-resolved",
};

export const LIKELIHOOD_IMPACT_LEVELS = [
  { label: "Low", value: 1 },
  { label: "Medium", value: 3 },
  { label: "High", value: 5 },
] as const;

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatLongDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
