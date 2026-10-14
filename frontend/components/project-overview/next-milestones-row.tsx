import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Milestone } from "./types";

export function NextMilestonesRow({ projectId, milestones }: { projectId: string; milestones: Milestone[] }) {
  const upcoming = milestones
    .filter((m) => !m.actual_date)
    .sort(
      (a, b) =>
        new Date(a.forecast_date ?? a.planned_date).getTime() - new Date(b.forecast_date ?? b.planned_date).getTime(),
    )
    .slice(0, 4);

  return (
    <section className="flex w-full flex-col gap-[16px] pb-[28px]">
      <div className="flex w-full items-center justify-between">
        <h3 className="text-[16px] font-semibold text-gca-dark">Next milestones</h3>
        <Link href={`/projects/${projectId}/milestones`} className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green">
          Timeline
          <ChevronRight className="size-[10px]" />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-[13px] text-gca-muted">No upcoming milestones.</p>
      ) : (
        <div className="flex w-full items-start justify-between">
          {upcoming.map((m, i) => {
            const date = m.forecast_date ?? m.planned_date;
            const atRisk = (m.slippage_days ?? 0) > 0;
            return (
              <div
                key={m.milestone_id}
                className={`flex w-[258px] flex-col gap-[4px] ${i > 0 ? "border-l border-gca-border pl-[20px]" : ""}`}
              >
                <p className="font-mono text-[13px] text-gca-show">
                  {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                </p>
                <p className="w-[230px] text-[15px] font-semibold text-gca-dark min-h-12 ">{m.title}</p>
                <p className={`text-[12px] font-medium ${atRisk ? "text-gca-warning" : "text-gca-green"}`}>
                  {atRisk ? `At risk · +${m.slippage_days} days` : "On track"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
