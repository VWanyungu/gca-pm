export type MilestoneSource = "schedule" | "custom";

/** A row from the merged schedule+custom milestone view. Read-only; "schedule" rows have no CRUD. */
export interface MilestoneRow {
  source: MilestoneSource;
  id: string;
  project_id: string;
  title: string;
  planned_date: string;
  forecast_date: string | null;
  actual_date: string | null;
  slippage_days: number | null;
  stage_no: number | null;
}

/** The full custom-milestone entity, used by the add/edit forms. */
export interface CustomMilestone {
  milestone_id: string;
  project_id: string;
  stage_no: number | null;
  title: string;
  planned_date: string;
  forecast_date: string | null;
  actual_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_by: string;
  updated_at: string;
  slippage_days?: number | null;
}

export function milestoneStatus(m: Pick<MilestoneRow, "actual_date" | "slippage_days">): {
  label: string;
  className: string;
} {
  if (m.actual_date) return { label: "Completed", className: "text-gca-green" };
  if ((m.slippage_days ?? 0) > 0) return { label: "At risk", className: "text-gca-warning" };
  return { label: "Upcoming", className: "text-gca-show" };
}

export function sourceLabel(source: MilestoneSource): { label: string; className: string } {
  return source === "schedule"
    ? { label: "Schedule", className: "text-gca-green" }
    : { label: "Custom", className: "text-gca-warning" };
}

export function variance(slippageDays: number | null): { label: string; className: string } {
  if (slippageDays === null || slippageDays === undefined) return { label: "—", className: "text-gca-show" };
  if (slippageDays > 0) return { label: `+${slippageDays}d`, className: "text-gca-warning" };
  if (slippageDays < 0) return { label: `${slippageDays}d`, className: "text-gca-show" };
  return { label: "0d", className: "text-gca-dark" };
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatLongDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** dd/mm/yyyy, as shown in the Figma form fields. */
export function formatInputDate(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
