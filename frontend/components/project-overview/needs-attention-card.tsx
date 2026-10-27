import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { StageActivity } from "./types";
// Escalations are paused until the module exists: see the commented block below.
// import type { EscalationRow } from "./types";

interface NeedsAttentionCardProps {
  projectId: string;
  overdueActivities: StageActivity[];
  draftWeekStart: string | null;
  // escalations: EscalationRow[];
}

export function NeedsAttentionCard({
  projectId,
  overdueActivities,
  draftWeekStart,
}: NeedsAttentionCardProps) {
  const rows: { title: string; subtitle: string; href: string }[] = [];

  if (overdueActivities.length > 0) {
    rows.push({
      title: `${overdueActivities.length} overdue task${overdueActivities.length > 1 ? "s" : ""}`,
      subtitle: overdueActivities
        .slice(0, 2)
        .map((a) => a.title)
        .join(" · "),
      href: `/projects/${projectId}/schedule`,
    });
  }

  if (draftWeekStart) {
    rows.push({
      title: `Week of ${new Date(draftWeekStart).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} submission in draft`,
      subtitle: "Not yet submitted",
      href: `/projects/${projectId}/weekly-submission`,
    });
  }

  // Paused: there is no escalations module yet, so these rows link nowhere. Restore this
  // block, the `escalations` prop and the `useOpenEscalations` call in overview.tsx together.
  // const now = new Date().getTime();
  // for (const esc of escalations) {
  //   const days = Math.max(0, Math.round((now - new Date(esc.created_at).getTime()) / 86400000));
  //   rows.push({
  //     title: esc.escalation_reason
  //       ? esc.escalation_reason.slice(0, 60)
  //       : "Escalation awaiting ExCo",
  //     subtitle: `Waiting ${days} day${days === 1 ? "" : "s"}`,
  //     href: `/projects/${projectId}/escalations`,
  //   });
  // }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[6px] rounded-[12px] border border-gca-border bg-gca-surface p-[16px] sm:p-[24px] xl:min-h-[415px]">
      <div className="flex items-center gap-[8px]">
        <h3 className="text-[16px] font-semibold text-gca-dark">Needs attention</h3>
        {rows.length > 0 && (
          <span className="rounded-[6px] bg-gca-warning-bg px-[7px] py-[2px] font-mono text-[12px] font-semibold text-gca-warning">
            {rows.length}
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-[12px] text-[13px] text-gca-muted">Nothing needs attention right now.</p>
      ) : (
        <div className="flex flex-col">
          {rows.map((row, i) => (
            <Link
              key={i}
              href={row.href}
              className={`flex items-center justify-between gap-[12px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
            >
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="text-[14px] font-medium text-gca-dark sm:w-[230px]">{row.title}</p>
                <p className="text-[12px] text-gca-muted sm:w-[230px]">{row.subtitle}</p>
              </div>
              <ChevronRight className="size-[18] shrink-0 text-gca-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
