"use client";

import { useMemo, useState } from "react";
import { Pagination } from "@/components/pagination";
import {
  formatShortDate,
  groupPlannedProgress,
  groupProgress,
  taskInWindow,
  taskStatusLabel,
  workDays,
  type DateWindow,
  type ScheduleTask,
} from "./types";

const PER_PAGE = 12;

interface ScheduleTableProps {
  tasks: ScheduleTask[];
  /** Restrict the displayed rows (used by the "Next 2 weeks" lookahead). Topic % stays cumulative. */
  window?: DateWindow;
}

export function ScheduleTable({ tasks, window }: ScheduleTableProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const leaves = useMemo(() => tasks.filter((t) => !t.is_summary), [tasks]);
  const groups = useMemo(() => tasks.filter((t) => t.is_summary), [tasks]);
  const windowedLeaves = useMemo(
    () => (window ? leaves.filter((t) => taskInWindow(t, window)) : leaves),
    [leaves, window],
  );
  const visibleLeaves = useMemo(
    () => windowedLeaves.filter((t) => !t.parent_task_id || !collapsed.has(t.parent_task_id)),
    [windowedLeaves, collapsed],
  );

  const total = visibleLeaves.length;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const pageLeaveIds = useMemo(
    () => new Set(visibleLeaves.slice((page - 1) * perPage, page * perPage).map((t) => t.task_id)),
    [visibleLeaves, page, perPage],
  );

  function toggleGroup(groupId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  if (tasks.length === 0) {
    return <p className="py-[56px] text-center text-[13px] text-gca-show">No schedule tasks to show.</p>;
  }

  // Groups render in order with their own page-visible children directly beneath; ungrouped leaves come
  // last. A topic with nothing in the current window (or with no children at all) doesn't show.
  const sections = [
    ...groups.map((g) => ({ group: g, children: windowedLeaves.filter((t) => t.parent_task_id === g.task_id) })),
    { group: null, children: windowedLeaves.filter((t) => !t.parent_task_id) },
  ].filter((s) => s.children.length > 0);

  if (sections.length === 0) {
    return <p className="py-[56px] text-center text-[13px] text-gca-show">No tasks in this window.</p>;
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col rounded-[12px] border border-gca-border">
        <div className="sticky top-0 z-10 flex w-full items-center gap-[10px] border-b border-gca-border bg-white px-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
          <p className="w-[28%]">Task</p>
          <p className="w-[11%]">Progress</p>
          <p className="w-[11%]">Planned</p>
          <p className="w-[11%]">Work days</p>
          <p className="w-[12%]">Start</p>
          <p className="w-[12%]">Finish</p>
          <p className="w-[15%]">Status</p>
        </div>

        <div className="max-h-[520px] overflow-y-auto">
          {sections.map(({ group, children }, si) => {
            const pageChildren = children.filter((t) => pageLeaveIds.has(t.task_id));
            const isCollapsed = group ? collapsed.has(group.task_id) : false;

            return (
              <div key={group?.task_id ?? "ungrouped"}>
                {group && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.task_id)}
                    className={`flex w-full cursor-pointer items-center gap-[10px] bg-gca-badge-bg px-[16px] py-[10px] text-left ${si > 0 ? "border-t border-gca-border" : ""}`}
                  >
                    <p className="flex w-[28%] items-center gap-[8px] truncate text-[13px] font-semibold text-gca-badge-text">
                      <span aria-hidden>{isCollapsed ? "▸" : "▾"}</span>
                      {group.task_name}
                    </p>
                    <p className="w-[11%] text-[13px] font-medium text-gca-badge-text">
                      {Math.round(groupProgress(group, tasks))}%
                    </p>
                    <p className="w-[11%] text-[13px] font-medium text-gca-badge-text">
                      {(() => {
                        const planned = groupPlannedProgress(group, tasks);
                        return planned !== null ? `${Math.round(planned)}%` : "—";
                      })()}
                    </p>
                    <p className="w-[11%] font-mono text-[13px] text-gca-badge-text">{workDays(group.duration_minutes)}</p>
                    <p className="w-[12%]" />
                    <p className="w-[12%]" />
                    <p className="w-[15%]" />
                  </button>
                )}
                {!isCollapsed &&
                  pageChildren.map((t, i) => {
                    const status = taskStatusLabel(t);
                    return (
                      <div
                        key={t.task_id}
                        className={`flex w-full items-center gap-[10px] px-[16px] py-[12px] ${i > 0 || !!group ? "border-t border-gca-border" : ""}`}
                      >
                        <p className="w-[28%] truncate pl-[16px] text-[13px] font-medium text-gca-dark">{t.task_name}</p>
                        <p className="w-[11%] text-[13px] text-gca-dark">{Math.round(Number(t.pct_work_complete))}%</p>
                        <p className="w-[11%] text-[13px] text-gca-show">
                          {t.planned_pct !== null ? `${Math.round(Number(t.planned_pct))}%` : "—"}
                        </p>
                        <p className="w-[11%] font-mono text-[13px] text-gca-dark">{workDays(t.duration_minutes)}</p>
                        <p className="w-[12%] font-mono text-[13px] text-gca-dark">{formatShortDate(t.start)}</p>
                        <p className="w-[12%] font-mono text-[13px] text-gca-dark">{formatShortDate(t.expected_finish)}</p>
                        <p className={`w-[15%] text-[13px] font-semibold ${status.className}`}>{status.label}</p>
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </div>

      {pages > 1 && (
        <Pagination
          page={page}
          totalPages={pages}
          perPage={perPage}
          total={total}
          onPageChange={setPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
          label="tasks"
        />
      )}
    </div>
  );
}
