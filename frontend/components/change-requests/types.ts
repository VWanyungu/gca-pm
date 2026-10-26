export type ChangeRequestStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type ChangeRequestType = "scope" | "schedule" | "cost";

export interface ChangeRequestAttachment {
  attachment_id: string;
  file_id: string;
  original_filename: string;
  url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface ChangeRequest {
  change_id: string;
  project_id: string;
  change_no: number;
  stage_no: number | null;
  type: ChangeRequestType;
  title: string;
  scope_description: string;
  reason: string;
  supporting_notes: string | null;
  cost_impact: number | null;
  cost_currency: string | null;
  schedule_impact_days: number | null;
  status: ChangeRequestStatus;
  raised_by: string;
  raised_at: string;
  decided_at: string | null;
  withdrawn_at: string | null;
  /** Only populated by the single-record fetch (GET /:changeId, and the create/update response) — not the list endpoint. */
  attachments?: ChangeRequestAttachment[];
}

export const TYPE_LABEL: Record<ChangeRequestType, string> = {
  scope: "Scope",
  schedule: "Schedule",
  cost: "Cost",
};

export function statusInfo(status: ChangeRequestStatus): { label: string; className: string } {
  switch (status) {
    case "pending":
      return { label: "Awaiting ExCo", className: "text-gca-warning" };
    case "approved":
      return { label: "Approved", className: "text-gca-green" };
    case "rejected":
      return { label: "Rejected", className: "text-error-text" };
    case "withdrawn":
      return { label: "Withdrawn", className: "text-gca-muted" };
  }
}

export function formatScheduleImpact(days: number | null): string {
  if (days == null) return "—";
  return `${days > 0 ? "+" : ""}${days} days`;
}

export function formatCostImpact(amount: number | null, currency: string | null): string {
  if (amount == null || !currency) return "—";
  const sign = amount < 0 ? "-" : "";
  const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    Math.abs(amount),
  );
  return `${sign}${currency} ${compact}`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatLongDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}
