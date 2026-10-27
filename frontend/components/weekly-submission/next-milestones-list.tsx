import type { Milestone } from "@/components/project-overview/types";
import { Trophy } from "lucide-react";

export function NextMilestonesList({ milestones }: { milestones: Milestone[] }) {
  const upcoming = milestones
    .filter((m) => !m.actual_date)
    .sort(
      (a, b) =>
        new Date(a.forecast_date ?? a.planned_date).getTime() -
        new Date(b.forecast_date ?? b.planned_date).getTime(),
    )
    .slice(0, 4);

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div>
        <h3 className="text-[16px] font-semibold text-gca-dark">Next milestones</h3>
        <p className="mt-[2px] text-[13px] text-gca-show">Next 4 weeks, from schedule</p>
      </div>

      {upcoming.length === 0 ? (
        <div className="flex flex-col items-center gap-[8px] rounded-[12px] bg-gca-page-bg py-[64px]">
          <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-surface">
            <Trophy className="size-[18px] text-gca-green" />
          </span>
          <div className="flex flex-col items-center gap-[4px] text-center">
            <p className="text-[15px] font-semibold text-gca-dark">No upcoming milestones</p>
            <p className="text-[13px] text-gca-muted">Upcoming milestones will appear here</p>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col">
          <div className="hidden gap-[16px] py-[8px] text-[12px] font-medium text-gca-muted md:flex">
            <span className="w-[372px]">Milestone</span>
            <span className="w-[150px]">Date</span>
            <span className="w-[150px]">Status</span>
          </div>
          {upcoming.map((m) => {
            const date = m.forecast_date ?? m.planned_date;
            const atRisk = (m.slippage_days ?? 0) > 0;
            return (
              <div
                key={m.milestone_id}
                className="flex flex-col gap-[2px] border-t border-gca-border py-[12px] text-[13px] md:flex-row md:gap-[16px]"
              >
                <span className="font-medium text-gca-dark md:w-[372px]">{m.title}</span>
                <span className="text-[12px] text-gca-muted md:w-[150px] md:text-[13px] md:text-gca-dark">
                  {new Date(date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`text-[12px] font-semibold md:w-[150px] md:text-[13px] ${atRisk ? "text-gca-warning" : "text-gca-green"}`}
                >
                  {atRisk ? "At risk" : "On track"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
