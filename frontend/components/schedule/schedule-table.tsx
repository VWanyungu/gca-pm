"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatShortDate,
  groupPlannedProgress,
  groupProgress,
  isHiddenByCollapse,
  phaseLevel,
  taskStatusLabel,
  visibleScheduleRows,
  workDays,
  type DateWindow,
  type ScheduleTask,
} from "./types";
import { ChevronDown, ChevronRight } from "lucide-react";

const INITIAL_ROWS = 24;
const LOAD_MORE_ROWS = 24;
const INDENT_PER_LEVEL = 16;

interface ScheduleTableProps {
  tasks: ScheduleTask[];
  /** Restrict the displayed rows (used by the "Next 2 weeks" lookahead). Phase % stays cumulative. */
  window?: DateWindow;
}

/**
 * The schedule as an indented tree, in the order the file lists it.
 *
 * A schedule is as deep as the planner made it — this file runs four levels — so rows are
 * rendered from one depth-first list rather than as groups-with-children. Incremental loading
 * slices that same list, so each newly shown batch stays in the schedule's original order.
 */
export function ScheduleTable({ tasks, window }: ScheduleTableProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const byId = useMemo(() => new Map(tasks.map((t) => [t.task_id, t])), [tasks]);
  const level = useMemo(() => phaseLevel(tasks), [tasks]);
  const ordered = useMemo(() => visibleScheduleRows(tasks, window), [tasks, window]);
  const rows = useMemo(
    () => ordered.filter((t) => !isHiddenByCollapse(t, byId, collapsed)),
    [ordered, byId, collapsed],
  );

  const baseLevel = useMemo(
    () => (ordered.length ? Math.min(...ordered.map((t) => t.outline_level)) : 1),
    [ordered],
  );

  const total = rows.length;
  const visibleRows = rows.slice(0, visibleCount);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = loadMoreRef.current;
    if (!root || !target || visibleCount >= total) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          setVisibleCount((count) => Math.min(count + LOAD_MORE_ROWS, total));
        }
      },
      { root, rootMargin: "0px 0px 200px 0px" },
    );
    observer.observe(target);

    return () => observer.disconnect();
  }, [total, visibleCount]);

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  if (tasks.length === 0) {
    return (
      <p className="py-[56px] text-center text-[13px] text-gca-show">No schedule tasks to show.</p>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="py-[56px] text-center text-[13px] text-gca-show">No tasks in this window.</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col">
        <div className="sticky top-0 z-9 flex w-full items-center gap-[10px] border-b border-gca-border bg-gca-surface px-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
          <p className="w-[28%]">Task</p>
          <p className="w-[11%]">Progress</p>
          <p className="w-[11%]">Planned</p>
          <p className="w-[11%]">Work days</p>
          <p className="w-[12%]">Start</p>
          <p className="w-[12%]">Finish</p>
          <p className="w-[15%]">Status</p>
        </div>

        <div ref={scrollContainerRef} className="max-h-[520px] overflow-y-auto">
          {visibleRows.map((t, i) => {
            const isPhase = t.outline_level === level;
            const isGroup = t.is_summary;
            const status = taskStatusLabel(t);
            const progress = isGroup ? groupProgress(t, tasks) : Number(t.pct_work_complete);
            const planned = isGroup
              ? groupPlannedProgress(t, tasks)
              : t.planned_pct !== null
                ? Number(t.planned_pct)
                : null;

            return (
              <div
                key={t.task_id}
                className={`flex w-full items-center gap-[10px] px-[16px] ${
                  isPhase ? "bg-gca-badge-bg py-[10px]" : "py-[12px]"
                } ${i > 0 ? "border-t border-gca-border" : ""}`}
              >
                <div
                  className="flex w-[28%] items-center gap-[8px] truncate pr-[8px]"
                  style={{ paddingLeft: (t.outline_level - baseLevel) * INDENT_PER_LEVEL }}
                >
                  {isGroup ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(t.task_id)}
                      className="cursor-pointer text-gca-muted"
                      aria-label={collapsed.has(t.task_id) ? "Expand" : "Collapse"}
                    >
                      {collapsed.has(t.task_id) ? (
                        <ChevronRight size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </button>
                  ) : (
                    <span className="w-[10px]" aria-hidden />
                  )}
                  {/* A milestone is a dated marker rather than work, and MS Project lets a summary
                      row carry the flag too, so the diamond is drawn independently of the row type. */}
                  {t.is_milestone && (
                    <span
                      className="shrink-0 text-[10px] text-gca-green"
                      title="Milestone"
                      aria-label="Milestone"
                    >
                      ◆
                    </span>
                  )}
                  <span
                    className={`truncate text-[13px] ${
                      isPhase
                        ? "font-medium tracking-[0.04em] text-gca-badge-text"
                        : isGroup
                          ? "font-semibold text-gca-dark"
                          : "font-medium text-gca-dark"
                    }`}
                    title={t.task_name}
                  >
                    {t.task_name}
                  </span>
                </div>

                <p className={`w-[11%] text-[13px] ${isGroup ? "font-medium" : ""} text-gca-dark`}>
                  {Math.round(progress)}%
                </p>
                <p
                  className={`w-[11%] text-[13px] ${isGroup ? "font-medium text-gca-dark" : "text-gca-show"}`}
                >
                  {planned !== null ? `${Math.round(planned)}%` : "—"}
                </p>
                <p className="w-[11%] font-mono text-[13px] text-gca-dark">
                  {workDays(t.duration_minutes)}
                </p>
                <p className="w-[12%] font-mono text-[13px] text-gca-dark">
                  {formatShortDate(t.start)}
                </p>
                <p className="w-[12%] font-mono text-[13px] text-gca-dark">
                  {formatShortDate(t.expected_finish)}
                </p>
                {/* A summary row's status is the roll-up of its children, which the Status column
                    cannot express, so only real work carries one. */}
                <p
                  className={`w-[15%] text-[13px] font-semibold ${isGroup ? "" : status.className}`}
                >
                  {isGroup ? "" : status.label}
                </p>
              </div>
            );
          })}
          {visibleCount < total && (
            <div ref={loadMoreRef} className="py-[12px] text-center text-[12px] text-gca-muted">
              Scroll to load more tasks
            </div>
          )}
        </div>
      </div>
      <p className="text-right text-[12px] text-gca-muted">
        Showing {visibleRows.length} of {total} rows
      </p>
    </div>
  );
}
