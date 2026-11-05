"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  canEditScheduleTask,
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
import { useEditScheduleTask } from "./use-schedule-data";
import { Check, ChevronDown, ChevronRight, LoaderCircle, Pencil, X } from "lucide-react";

const INITIAL_ROWS = 24;
const LOAD_MORE_ROWS = 24;
const INDENT_PER_LEVEL = 16;

/** `start`/`expected_finish` are full timestamps; a date input only wants the calendar date. */
function toDateInputValue(iso: string): string {
  return iso.slice(0, 10);
}

interface EditDraft {
  taskId: string;
  start: string;
  plannedEndDate: string;
  plannedFinishDate: string;
  pctWorkComplete: string;
  error: string | null;
}

interface EditingSnapshot {
  draft: EditDraft | null;
  isSaving: boolean;
}

interface EditingState {
  /** A ref, not plain state: cell render functions read `.current` fresh on every render, so
   *  `columns` below never has to depend on the draft and get rebuilt on each keystroke — that
   *  rebuild previously made react-table treat the row as new, remounting the Start input and
   *  stealing focus back to it (its `autoFocus`) after every character typed elsewhere. */
  snapshot: { current: EditingSnapshot };
  onStartEdit: (task: ScheduleTask) => void;
  onChange: (
    patch: Partial<
      Pick<EditDraft, "start" | "plannedEndDate" | "plannedFinishDate" | "pctWorkComplete">
    >,
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

const inlineInputClassName =
  "h-[32px] w-full min-w-0 rounded-[6px] border border-gca-green px-[8px] text-[13px] outline-none";

function buildColumns(
  tasks: ScheduleTask[],
  level: number,
  baseLevel: number,
  collapsed: Set<string>,
  toggleGroup: (groupId: string) => void,
  canEdit: boolean,
  editing: EditingState,
): ColumnDef<ScheduleTask>[] {
  return [
    {
      id: "task",
      header: "Task",
      meta: { className: "min-w-0 flex-1" },
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
      meta: { className: "w-[64px] shrink-0" },
      cell: ({ row }) => {
        const t = row.original;
        const isGroup = t.is_summary;
        const draft = editing.snapshot.current.draft;
        if (draft?.taskId === t.task_id) {
          return (
            <input
              type="number"
              min={0}
              max={100}
              value={draft.pctWorkComplete}
              onChange={(e) => editing.onChange({ pctWorkComplete: e.target.value })}
              className={inlineInputClassName}
            />
          );
        }
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
      meta: { className: "w-[60px] shrink-0" },
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
      meta: { className: "w-[80px] shrink-0" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">
          {workDays(row.original.duration_minutes)}
        </p>
      ),
    },
    {
      id: "start",
      header: "Start",
      meta: { className: "w-[64px] shrink-0" },
      cell: ({ row }) => {
        const t = row.original;
        const draft = editing.snapshot.current.draft;
        if (draft?.taskId === t.task_id) {
          return (
            <input
              type="date"
              autoFocus
              value={draft.start}
              onChange={(e) => editing.onChange({ start: e.target.value })}
              className={inlineInputClassName}
            />
          );
        }
        return <p className="font-mono text-[13px] text-gca-dark">{formatShortDate(t.start)}</p>;
      },
    },
    {
      id: "plannedFinish",
      header: "Planned finish",
      meta: { className: "w-[104px] shrink-0" },
      cell: ({ row }) => {
        const t = row.original;
        const draft = editing.snapshot.current.draft;
        if (draft?.taskId === t.task_id) {
          return (
            <input
              type="date"
              value={draft.plannedFinishDate}
              onChange={(e) => editing.onChange({ plannedFinishDate: e.target.value })}
              className={inlineInputClassName}
            />
          );
        }
        return (
          <p className="font-mono text-[13px] text-gca-dark">{formatShortDate(plannedFinish(t))}</p>
        );
      },
    },
    {
      id: "forecast",
      header: "Forecast",
      meta: { className: "w-[76px] shrink-0" },
      cell: ({ row }) => {
        const t = row.original;
        const draft = editing.snapshot.current.draft;
        if (draft?.taskId === t.task_id) {
          return (
            <input
              type="date"
              value={draft.plannedEndDate}
              onChange={(e) => editing.onChange({ plannedEndDate: e.target.value })}
              className={inlineInputClassName}
            />
          );
        }
        return (
          <p className="font-mono text-[13px] text-gca-show">
            {formatShortDate(t.expected_finish)}
          </p>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      meta: { className: "w-[92px] shrink-0" },
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
    {
      id: "edit",
      header: "",
      meta: { className: "w-[32px] shrink-0" },
      cell: ({ row }) => {
        const t = row.original;
        const { draft, isSaving } = editing.snapshot.current;
        if (draft?.taskId === t.task_id) {
          return (
            <div className="flex items-center gap-[10px]">
              <button
                type="button"
                onClick={editing.onSave}
                disabled={isSaving}
                aria-label="Save"
                className="cursor-pointer text-gca-green disabled:opacity-50"
              >
                {isSaving ? (
                  <LoaderCircle size={18} className="animate-spin" aria-label="Saving" />
                ) : (
                  <Check size={18} />
                )}
              </button>
              <button
                type="button"
                onClick={editing.onCancel}
                disabled={isSaving}
                aria-label="Cancel"
                className="cursor-pointer text-gca-muted hover:text-error-text disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>
          );
        }
        if (!canEdit || !canEditScheduleTask(t, tasks)) return null;
        return (
          <button
            type="button"
            onClick={() => editing.onStartEdit(t)}
            aria-label={`Edit ${t.task_name}`}
            className="cursor-pointer text-gca-muted hover:text-gca-green"
          >
            <Pencil size={14} />
          </button>
        );
      },
    },
  ];
}

interface ScheduleTableProps {
  tasks: ScheduleTask[];
  /** Restrict the displayed rows (used by the "Next 2 weeks" lookahead). Phase % stays cumulative. */
  window?: DateWindow;
  /** Whether the current user may edit tasks at all; per-row eligibility is still checked via
   *  canEditScheduleTask (a leaf task, or the sole summary row when there are no tasks). */
  canEdit?: boolean;
  projectId: string;
}

/**
 * The schedule as an indented tree, in the order the file lists it.
 *
 * A schedule is as deep as the planner made it — this file runs four levels — so rows are
 * rendered from one depth-first list rather than as groups-with-children. Incremental loading
 * slices that same list, so each newly shown batch stays in the schedule's original order.
 */
export function ScheduleTable({ tasks, window, canEdit = false, projectId }: ScheduleTableProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_ROWS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const editTask = useEditScheduleTask(projectId);
  const editingSnapshot = useRef<EditingSnapshot>({ draft: null, isSaving: false });
  editingSnapshot.current = { draft: editDraft, isSaving: editTask.isPending };
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
  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);

  // @tanstack/react-table expects stable `columns`/`data` references; recreating them on every
  // render (as this did before) makes it recompute its row model every render, which for a
  // few-hundred-row schedule compounds into a render loop that pegs the main thread — and, for
  // the row under edit, remounts its inputs (stealing focus back to the autoFocus'd Start field
  // on every keystroke). `editingSnapshot` is a ref for exactly this reason: cells read it fresh
  // each render without `columns` needing to depend on — and get rebuilt for — the draft.
  const columns = useMemo(
    () =>
      buildColumns(tasks, level, baseLevel, collapsed, toggleGroup, canEdit, {
        snapshot: editingSnapshot,
        onStartEdit: startEdit,
        onChange: (patch) => setEditDraft((d) => (d ? { ...d, ...patch, error: null } : d)),
        onSave: saveEdit,
        onCancel: () => setEditDraft(null),
      }),
    [tasks, level, baseLevel, collapsed, canEdit],
  );
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

  function startEdit(task: ScheduleTask) {
    setEditDraft({
      taskId: task.task_id,
      start: toDateInputValue(task.start),
      plannedEndDate: toDateInputValue(task.expected_finish),
      plannedFinishDate: toDateInputValue(plannedFinish(task)),
      pctWorkComplete: String(Math.round(Number(task.pct_work_complete))),
      error: null,
    });
  }

  async function saveEdit() {
    const draft = editingSnapshot.current.draft;
    if (!draft) return;
    const pct = Number(draft.pctWorkComplete);
    if (draft.pctWorkComplete.trim() === "" || Number.isNaN(pct) || pct < 0 || pct > 100) {
      setEditDraft({ ...draft, error: "Actual complete must be a number between 0 and 100" });
      return;
    }
    if (new Date(draft.plannedEndDate) < new Date(draft.start)) {
      setEditDraft({ ...draft, error: "Planned end date cannot be before the start date" });
      return;
    }
    if (new Date(draft.plannedFinishDate) < new Date(draft.start)) {
      setEditDraft({ ...draft, error: "Planned finish date cannot be before the start date" });
      return;
    }
    try {
      await editTask.mutateAsync({
        taskId: draft.taskId,
        input: {
          start: draft.start,
          plannedEndDate: draft.plannedEndDate,
          plannedFinishDate: draft.plannedFinishDate,
          pctWorkComplete: pct,
        },
      });
      setEditDraft(null);
    } catch {
      // Already shown as a toast by the api client; keep the row open to retry.
    }
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
                className={
                  (header.column.columnDef.meta as { className?: string } | undefined)?.className
                }
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </p>
            ))}
          </div>

          <div ref={scrollContainerRef} className="max-h-[520px] overflow-y-auto overflow-x-hidden">
            {table.getRowModel().rows.map((row, i) => {
              const isPhase = row.original.outline_level === level;
              const isEditing = editDraft?.taskId === row.original.task_id;
              const rowContent = (
                <div
                  className={`flex w-full items-center gap-[10px] px-[16px] ${
                    isPhase ? "bg-gca-badge-bg py-[10px]" : "py-[12px]"
                  } ${!isEditing && i > 0 ? "border-t border-gca-border" : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <span
                      key={cell.id}
                      className={
                        (cell.column.columnDef.meta as { className?: string } | undefined)
                          ?.className
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  ))}
                </div>
              );
              if (!isEditing) return <Fragment key={row.id}>{rowContent}</Fragment>;
              return (
                <div key={row.id} className="border border-gca-green">
                  {rowContent}
                  {editDraft.error && (
                    <p className="px-[16px] pb-[10px] text-[12px] text-error-text">
                      {editDraft.error}
                    </p>
                  )}
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
