"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import {
  daysLate,
  formatShortDate,
  groupByTopic,
  hasOpenRisk,
  spentRiskLabel,
  type OverdueTask,
  type ScheduleTask,
} from "./types";

interface OverdueTasksViewProps {
  projectId: string;
  tasks: OverdueTask[];
  /** The full schedule task list, used only to resolve each overdue task's phase group name. */
  allTasks: ScheduleTask[];
  onAddAsRisk: (task: OverdueTask) => void;
}

const INITIAL_ROWS = 24;
const LOAD_MORE_ROWS = 24;

function groupFilterValue(group: string | null): string {
  return group === null ? "ungrouped" : `group:${group}`;
}

export function OverdueTasksView({
  projectId,
  tasks,
  allTasks,
  onAddAsRisk,
}: OverdueTasksViewProps) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const groups = groupByTopic(tasks, (t) => t.task_id, allTasks);
  const activeGroup = groups.some(({ group }) => groupFilterValue(group) === selectedGroup)
    ? selectedGroup
    : "";
  const matchingGroups = activeGroup
    ? groups.filter(({ group }) => groupFilterValue(group) === activeGroup)
    : groups;

  // Rows are revealed in batches as the reader reaches the end, the same way the schedule
  // table does it. Counting across groups keeps a group's heading with its first rows.
  const total = useMemo(
    () => matchingGroups.reduce((sum, g) => sum + g.items.length, 0),
    [matchingGroups],
  );
  const visibleGroups = useMemo(() => {
    let budget = visibleCount;
    const shown: typeof matchingGroups = [];
    for (const { group, items } of matchingGroups) {
      if (budget <= 0) break;
      shown.push({ group, items: items.slice(0, budget) });
      budget -= Math.min(items.length, budget);
    }
    return shown;
  }, [matchingGroups, visibleCount]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || visibleCount >= total) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setVisibleCount((count) => Math.min(count + LOAD_MORE_ROWS, total));
        }
      },
      { rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [total, visibleCount]);

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
    <div className="flex w-full flex-col bg-gca-surface">
      {/* <div className="flex items-center gap-[8px] border-b border-gca-border px-[20px] py-[14px]">
        <p className="text-[14px] font-semibold text-gca-dark">Overdue tasks</p>
        <span className="text-[13px] font-semibold text-error-text">{tasks.length}</span>
        <p className="text-[13px] text-gca-show">Past expected finish and not complete</p>
      </div> */}

      {groups.length > 1 && (
        <div className="flex justify-start border-b border-gca-border pb-[20px]">
          <Dropdown
            id="overdue-group-filter"
            title="All groups"
            data={[
              {
                id: "",
                name: "All groups",
              },
              ...groups.map(({ group }) => ({
                id: groupFilterValue(group),
                name: group ?? "Other",
              })),
            ]}
            selectedId={activeGroup || undefined}
            onSelect={(id) => {
              setSelectedGroup(id);
              setVisibleCount(INITIAL_ROWS);
            }}
            style="h-[36px] w-[200px]  rounded-[8px] border border-gca-border bg-gca-surface px-[10px] text-[13px] text-gca-dark"
          />
        </div>
      )}

      {visibleGroups.map(({ group, items }, gi) => (
        <div key={group ?? "ungrouped"}>
          <div
            className={`bg-gca-badge-bg px-[20px] py-[8px] ${gi > 0 ? "border-t border-gca-border" : ""}`}
          >
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
                  {Math.round(Number(t.pct_work_complete))}% complete ·{" "}
                  {daysLate(t.expected_finish)} days late
                </p>
              </div>

              {hasOpenRisk(t) ? (
                <div className="flex shrink-0 items-center gap-[12px] text-[13px] font-medium">
                  <span className="text-gca-show">Risk raised</span>
                  <Link
                    href={`/projects/${projectId}/risks`}
                    className="text-gca-green hover:underline"
                  >
                    View
                  </Link>
                </div>
              ) : (
                <div className="flex shrink-0 items-center gap-[12px]">
                  {t.risk_id && (
                    <span className="text-[13px] text-gca-muted">
                      {spentRiskLabel(t.risk_status)}
                    </span>
                  )}
                  <button
                    onClick={() => onAddAsRisk(t)}
                    className="cursor-pointer flex shrink-0 items-center gap-[6px] rounded-[8px] border border-gca-border px-[14px] py-[8px] text-[13px] font-semibold text-gca-dark hover:bg-gca-page-bg"
                  >
                    Add as risk
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {visibleCount < total && (
        <div ref={loadMoreRef} className="py-[16px] text-center text-[13px] text-gca-muted">
          Loading more…
        </div>
      )}
    </div>
  );
}
