"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { daysLate, formatShortDate, groupByTopic, type OverdueTask, type ScheduleTask } from "./types";

interface OverdueTasksViewProps {
  projectId: string;
  tasks: OverdueTask[];
  /** The full schedule task list, used only to resolve each overdue task's phase group name. */
  allTasks: ScheduleTask[];
  onAddAsRisk: (task: OverdueTask) => void;
}

export function OverdueTasksView({ projectId, tasks, allTasks, onAddAsRisk }: OverdueTasksViewProps) {
  const groups = groupByTopic(tasks, (t) => t.task_id, allTasks);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-[16px] py-[56px]">
        <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
          <AlertTriangle className="size-[18px] text-gca-green" />
        </span>
        <div className="flex flex-col items-center gap-[4px] text-center">
          <p className="text-[14px] font-semibold text-gca-dark">Nothing overdue</p>
          <p className="max-w-[420px] text-[13px] text-gca-show">
            Tasks past their expected finish and not complete will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col rounded-[12px] border border-gca-border bg-white">
      <div className="flex items-center gap-[8px] border-b border-gca-border px-[20px] py-[14px]">
        <p className="text-[14px] font-semibold text-gca-dark">Overdue tasks</p>
        <span className="text-[13px] font-semibold text-error-text">{tasks.length}</span>
        <p className="text-[13px] text-gca-show">Past expected finish and not complete</p>
      </div>

      {groups.map(({ group, items }, gi) => (
        <div key={group ?? "ungrouped"}>
          <div className={`bg-gca-badge-bg px-[20px] py-[8px] ${gi > 0 ? "border-t border-gca-border" : ""}`}>
            <p className="text-[12px] font-semibold text-gca-badge-text">{group ?? "Other"}</p>
          </div>
          {items.map((t, i) => (
            <div
              key={t.task_id}
              className={`flex w-full items-center justify-between gap-[16px] px-[20px] py-[16px] ${i > 0 ? "border-t border-gca-border" : ""}`}
            >
              <div>
                <p className="text-[14px] font-medium text-gca-dark">{t.task_name}</p>
                <p className="mt-[2px] text-[13px] text-gca-show">
                  {t.wbs} · expected finish {formatShortDate(t.expected_finish)} ·{" "}
                  {Math.round(Number(t.pct_work_complete))}% complete · {daysLate(t.expected_finish)} days late
                </p>
              </div>

              {t.risk_id ? (
                <div className="flex shrink-0 items-center gap-[12px] text-[13px] font-medium">
                  <span className="text-gca-show">Risk raised</span>
                  <Link href={`/projects/${projectId}/risks`} className="text-gca-green hover:underline">
                    View
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => onAddAsRisk(t)}
                  className="cursor-pointer flex shrink-0 items-center gap-[6px] rounded-[8px] border border-gca-border px-[14px] py-[8px] text-[13px] font-semibold text-gca-dark hover:bg-gca-page-bg"
                >
                  + Add as risk
                </button>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
