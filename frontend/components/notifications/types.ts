import { FileCheck, AlertTriangle, CheckCircle2, Hourglass, XCircle, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NotificationRow {
  notification_id: string;
  recipient_id: string;
  type_code: string;
  project_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  in_app: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationPreferenceItem {
  type_code: string;
  enabled: boolean;
}

interface TypeMeta {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  pill?: { label: string; bg: string; text: string };
}

const DEFAULT_META: TypeMeta = {
  icon: Bell,
  iconBg: "bg-gca-page-bg",
  iconColor: "text-gca-show",
};

const TYPE_META: Record<string, TypeMeta> = {
  weekly_submission_approved: {
    icon: FileCheck,
    iconBg: "bg-[#e8f1ea]",
    iconColor: "text-gca-green",
  },
  weekly_submission_due: {
    icon: Hourglass,
    iconBg: "bg-[#f3f6f3]",
    iconColor: "text-gca-show",
  },
  weekly_submission_superseded: {
    icon: Hourglass,
    iconBg: "bg-[#f3f6f3]",
    iconColor: "text-gca-show",
  },
  task_overdue_risk: {
    icon: AlertTriangle,
    iconBg: "bg-[#fff4e5]",
    iconColor: "text-gca-warning",
    pill: { label: "Unaddressed", bg: "bg-[#fff4e5]", text: "text-gca-warning" },
  },
  reconciliation_flag_raised: {
    icon: AlertTriangle,
    iconBg: "bg-[#fff4e5]",
    iconColor: "text-gca-warning",
  },
  schedule_uploaded: {
    icon: FileCheck,
    iconBg: "bg-[#e8f1ea]",
    iconColor: "text-gca-green",
  },
  dpr_submitted: {
    icon: CheckCircle2,
    iconBg: "bg-[#e8f1ea]",
    iconColor: "text-gca-green",
  },
  dpr_missing: {
    icon: XCircle,
    iconBg: "bg-error-bg",
    iconColor: "text-error-text",
  },
  dpr_submitted_late: {
    icon: XCircle,
    iconBg: "bg-error-bg",
    iconColor: "text-error-text",
  },
  dpr_amendment_requested: {
    icon: XCircle,
    iconBg: "bg-error-bg",
    iconColor: "text-error-text",
  },
  change_request_decision: {
    icon: Hourglass,
    iconBg: "bg-[#f3f6f3]",
    iconColor: "text-gca-show",
    pill: { label: "In review", bg: "bg-transparent", text: "text-gca-show" },
  },
  escalation_raised_or_answered: {
    icon: AlertTriangle,
    iconBg: "bg-[#fff4e5]",
    iconColor: "text-gca-warning",
  },
  risk_escalated: {
    icon: AlertTriangle,
    iconBg: "bg-[#fff4e5]",
    iconColor: "text-gca-warning",
  },
};

export function metaFor(typeCode: string): TypeMeta {
  return TYPE_META[typeCode] ?? DEFAULT_META;
}

export interface PreferenceGroup {
  heading: string;
  items: { type_code: string; label: string }[];
}

export const PREFERENCE_GROUPS: PreferenceGroup[] = [
  {
    heading: "Daily reporting",
    items: [
      { type_code: "dpr_missing", label: "DPR missing" },
      { type_code: "dpr_submitted_late", label: "DPR submitted late" },
      { type_code: "dpr_amendment_requested", label: "DPR amendment requested" },
    ],
  },
  {
    heading: "Weekly submission",
    items: [
      { type_code: "weekly_submission_due", label: "Submission due" },
      { type_code: "weekly_submission_approved", label: "Submission approved" },
      { type_code: "weekly_submission_superseded", label: "Submission superseded" },
    ],
  },
  {
    heading: "Risks & schedule",
    items: [
      { type_code: "task_overdue_risk", label: "New overdue task risk" },
      { type_code: "schedule_uploaded", label: "Schedule uploaded" },
      { type_code: "reconciliation_flag_raised", label: "Reconciliation flag raised" },
    ],
  },
  {
    heading: "Escalations & changes",
    items: [
      { type_code: "escalation_raised_or_answered", label: "Escalation raised or answered" },
      { type_code: "change_request_decision", label: "Change request decision" },
    ],
  },
];

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function timeLabel(iso: string): string {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday} ${time}`;
}
