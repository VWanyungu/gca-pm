import type { WeeklySubmission, SubmissionAddressedRisk } from "./types";
import { formatWeekPeriod, weekNumber } from "./types";

export const DEPARTMENT_LEAD_EMAIL = process.env.NEXT_PUBLIC_DEPARTMENT_LEAD_EMAIL ?? "";

/** mailto: can't carry an attachment, so "the report" is this plain-text summary in the body. */
export function buildSubmissionReportText({
  submission,
  projectName,
  addressedRisks,
}: {
  submission: WeeklySubmission;
  projectName: string;
  addressedRisks: SubmissionAddressedRisk[];
}): string {
  const lines: string[] = [];
  lines.push(`${projectName} — Week ${weekNumber(submission.week_start)} submission`);
  lines.push(formatWeekPeriod(submission.week_start));
  lines.push("");

  if (submission.planned_pct != null && submission.actual_pct != null) {
    lines.push(`Planned: ${submission.planned_pct}%  Actual: ${submission.actual_pct}%  SPI: ${submission.spi ?? "—"}`);
    lines.push("");
  }

  lines.push("Commentary:");
  lines.push(submission.pm_commentary?.trim() || "—");
  lines.push("");

  lines.push("Top risks and actions:");
  if (addressedRisks.length === 0) {
    lines.push("—");
  } else {
    for (const risk of addressedRisks) {
      const tag = risk.risk_id === submission.top_risk_id ? " (main top risk)" : "";
      lines.push(`- ${risk.risk_title ?? "Risk"}${tag}`);
    }
  }

  if (submission.escalate && submission.escalation_reason) {
    lines.push("");
    lines.push(`Escalated: ${submission.escalation_reason}`);
  }

  return lines.join("\n");
}

export function buildMailto({
  to,
  cc,
  subject,
  body,
}: {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
}): string {
  const params = new URLSearchParams();
  if (cc && cc.length > 0) params.set("cc", cc.join(","));
  params.set("subject", subject);
  params.set("body", body);
  return `mailto:${to.join(",")}?${params.toString()}`;
}
