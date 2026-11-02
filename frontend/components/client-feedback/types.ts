export type FeedbackRequestStatus = "sent" | "opened" | "responded" | "expired";

export interface FeedbackRequest {
  request_id: string;
  project_id: string;
  contact_id: string;
  contact_name: string;
  contact_title: string | null;
  contact_email: string;
  requested_by: string;
  about: string;
  token: string;
  expires_at: string;
  opened_at: string | null;
  responded_at: string | null;
  rating_overall: number | null;
  rating_quality: number | null;
  rating_updates: number | null;
  rating_schedule: number | null;
  comment: string | null;
  created_at: string;
  status: FeedbackRequestStatus;
}

export interface FeedbackRatingSummary {
  count: number;
  overall: number | null;
  quality: number | null;
  updates: number | null;
  schedule: number | null;
}

export function statusLabel(status: FeedbackRequestStatus): { label: string; className: string } {
  switch (status) {
    case "sent":
      return { label: "Sent", className: "bg-gca-page-bg text-gca-show" };
    case "opened":
      return { label: "Opened", className: "bg-gca-page-bg text-gca-show" };
    case "responded":
      return { label: "Responded", className: "bg-gca-badge-bg text-gca-badge-text" };
    case "expired":
      return { label: "Expired", className: "bg-gca-page-bg text-gca-muted" };
  }
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function feedbackLink(token: string): string {
  if (typeof window === "undefined") return `/feedback/${token}`;
  return `${window.location.origin}/feedback/${token}`;
}
