"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  formatShortDate,
  groupPlannedProgress,
  groupProgress,
  isHiddenByCollapse,
  phaseLevel,
  plannedFinish,
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

function buildColumns(
  tasks: ScheduleTask[],
  level: number,
  baseLevel: number,
  collapsed: Set<string>,
  toggleGroup: (groupId: string) => void,
): ColumnDef<ScheduleTask>[] {
  return [
    {
      id: "task",
      header: "Task",
      meta: { className: "w-[24%]" },
      cell: ({ row }) => {
        const t = row.original;
        const isPhase = t.outline_level === level;
        const isGroup = t.is_summary;
        return (
          <div
            className="flex items-center gap-[8px] truncate pr-[8px]"
            style={{ paddingLeft: (t.outline_level - baseLevel) * INDENT_PER_LEVEL }}
          >
            {isGroup ? (
              <button
                type="button"
                onClick={() => toggleGroup(t.task_id)}
                className="cursor-pointer text-gca-muted"
                aria-label={collapsed.has(t.task_id) ? "Expand" : "Collapse"}
              >
                {collapsed.has(t.task_id) ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
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
        );
      },
    },
    {
      id: "progress",
      header: "Progress",
      meta: { className: "w-[9%]" },
      cell: ({ row }) => {
        const t = row.original;
        const isGroup = t.is_summary;
        const progress = isGroup ? groupProgress(t, tasks) : Number(t.pct_work_complete);
        return (
          <p className={`text-[13px] ${isGroup ? "font-medium" : ""} text-gca-dark`}>
            {Math.round(progress)}%
          </p>
        );
      },
    },
    {
      id: "planned",
      header: "Planned",
      meta: { className: "w-[9%]" },
      cell: ({ row }) => {
        const t = row.original;
        const isGroup = t.is_summary;
        const planned = isGroup
          ? groupPlannedProgress(t, tasks)
          : t.planned_pct !== null
            ? Number(t.planned_pct)
            : null;
        return (
          <p className={`text-[13px] ${isGroup ? "font-medium text-gca-dark" : "text-gca-show"}`}>
            {planned !== null ? `${Math.round(planned)}%` : "—"}
          </p>
        );
      },
    },
    {
      id: "workDays",
      header: "Work days",
      meta: { className: "w-[9%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">{workDays(row.original.duration_minutes)}</p>
      ),
    },
    {
      id: "start",
      header: "Start",
      meta: { className: "w-[10%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">{formatShortDate(row.original.start)}</p>
      ),
    },
    {
      id: "plannedFinish",
      header: "Planned finish",
      meta: { className: "w-[11%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">{formatShortDate(plannedFinish(row.original))}</p>
      ),
    },
    {
      id: "forecast",
      header: "Forecast",
      meta: { className: "w-[11%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-show">{formatShortDate(row.original.expected_finish)}</p>
      ),
    },
    {
      id: "status",
      header: "Status",
      meta: { className: "w-[15%]" },
      cell: ({ row }) => {
        const t = row.original;
        const isGroup = t.is_summary;
        // A summary row's status is the roll-up of its children, which the Status column
        // cannot express, so only real work carries one.
        const status = taskStatusLabel(t);
        return (
          <p className={`text-[13px] font-semibold ${isGroup ? "" : status.className}`}>
            {isGroup ? "" : status.label}
          </p>
        );
      },
    },
  ];
}

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

  const columns = buildColumns(tasks, level, baseLevel, collapsed, toggleGroup);
  const table = useReactTable({ data: visibleRows, columns, getCoreRowModel: getCoreRowModel() });

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
      {/* Eight date and percentage columns need ~980px to stay readable, so below md the
          table scrolls sideways with its header rather than squeezing every column. */}
      <div className="no-scrollbar flex w-full min-w-0 flex-col overflow-x-auto">
        <div className="flex w-full min-w-[980px] flex-col">
          <div className="sticky top-0 z-9 flex w-full items-center gap-[10px] border-b border-gca-border bg-gca-surface px-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
            {table.getFlatHeaders().map((header) => (
              <p
                key={header.id}
                className={(header.column.columnDef.meta as { className?: string } | undefined)?.className}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </p>
            ))}
          </div>

          <div ref={scrollContainerRef} className="max-h-[520px] overflow-y-auto">
            {table.getRowModel().rows.map((row, i) => {
              const isPhase = row.original.outline_level === level;
              return (
                <div
                  key={row.id}
                  className={`flex w-full items-center gap-[10px] px-[16px] ${
                    isPhase ? "bg-gca-badge-bg py-[10px]" : "py-[12px]"
                  } ${i > 0 ? "border-t border-gca-border" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <span
                      key={cell.id}
                      className={(cell.column.columnDef.meta as { className?: string } | undefined)?.className}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  ))}
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
      </div>
      <p className="text-right text-[12px] text-gca-muted">
        Showing {visibleRows.length} of {total} rows
      </p>
    </div>
  );
}
