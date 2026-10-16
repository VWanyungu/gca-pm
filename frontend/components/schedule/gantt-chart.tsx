"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gantt, ViewMode, type Task as GanttTaskBase } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import {
  barColor,
  clampToWindow,
  groupProgress,
  orderForGanttDisplay,
  rootGroupName,
  taskInWindow,
  topicOrder,
  workDays,
  type DateWindow,
  type ScheduleTask,
} from "./types";

type GanttTask = GanttTaskBase & { durationMinutes: number };

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 56;
const GANTT_HEIGHT = 520;
const TASK_COL = 300;
const PROGRESS_COL = 90;
const WORKDAYS_COL = 90;
const LIST_WIDTH = TASK_COL + PROGRESS_COL + WORKDAYS_COL;
const COLUMN_WIDTH = 44;
const LOOKAHEAD_DAYS = 14;

function ProgressRing({ pct }: { pct: number }) {
  return (
    <span
      className="relative inline-flex size-[14px] shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(var(--gca-green) ${pct * 3.6}deg, var(--gca-border) 0deg)` }}
    >
      <span className="absolute inset-[2px] rounded-full bg-white" />
    </span>
  );
}

interface GanttChartProps {
  tasks: ScheduleTask[];
  /** Restrict the displayed window (used by the "Next 2 weeks" lookahead). */
  window?: DateWindow;
}

export function GanttChart({ tasks, window }: GanttChartProps) {
  const byId = useMemo(() => new Map(tasks.map((t) => [t.task_id, t])), [tasks]);
  const byMppId = useMemo(() => new Map(tasks.map((t) => [t.mpp_unique_id, t])), [tasks]);
  const topics = useMemo(() => topicOrder(tasks), [tasks]);

  const visible = useMemo(() => {
    if (!window) return orderForGanttDisplay(tasks);
    // Keep leaves that overlap the window, plus only the ancestor groups that still have
    // a surviving descendant — an empty topic shouldn't show up in a 2-week lookahead.
    const survivingLeafIds = new Set(
      tasks.filter((t) => !t.is_summary && taskInWindow(t, window)).map((t) => t.task_id),
    );
    const childrenOf = new Map<string, ScheduleTask[]>();
    for (const t of tasks) {
      if (!t.parent_task_id) continue;
      const list = childrenOf.get(t.parent_task_id);
      if (list) list.push(t);
      else childrenOf.set(t.parent_task_id, [t]);
    }
    function hasSurvivingDescendant(t: ScheduleTask): boolean {
      if (survivingLeafIds.has(t.task_id)) return true;
      return (childrenOf.get(t.task_id) ?? []).some(hasSurvivingDescendant);
    }
    const kept = tasks.filter((t) => (t.is_summary ? hasSurvivingDescendant(t) : survivingLeafIds.has(t.task_id)));
    return orderForGanttDisplay(kept);
  }, [tasks, window]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Stable across re-renders so the library's initial-scroll effect doesn't keep re-firing.
  const today = useMemo(() => new Date(), []);

  const rows = useMemo<GanttTask[]>(
    () =>
      visible.map((t) => {
        const groupName = rootGroupName(t, byId);
        const topicIndex = groupName ? topics.indexOf(groupName) : -1;
        const rawStart = new Date(t.start);
        const rawEnd = t.is_milestone ? rawStart : new Date(t.expected_finish);
        const { start, end } = window
          ? clampToWindow(rawStart, rawEnd, window)
          : { start: rawStart, end: rawEnd < rawStart ? rawStart : rawEnd };
        return {
          id: t.task_id,
          type: t.is_summary ? "project" : t.is_milestone ? "milestone" : "task",
          name: t.task_name,
          start,
          end,
          progress: t.is_summary ? groupProgress(t, visible) : Number(t.pct_work_complete),
          project: t.parent_task_id ?? undefined,
          dependencies: (Array.isArray(t.predecessors) ? t.predecessors : [])
            .map((id) => byMppId.get(id)?.task_id)
            .filter((id): id is string => !!id),
          durationMinutes: t.duration_minutes,
          hideChildren: t.is_summary ? collapsed.has(t.task_id) : undefined,
          styles: t.is_summary
            ? undefined
            : { backgroundColor: barColor(t, topicIndex), progressColor: "rgba(0,0,0,0.22)" },
        };
      }),
    [visible, byId, byMppId, topics, collapsed, window],
  );

  // The library's own scroll-to-viewDate effect races with its "no scroll set yet" default
  // (which jumps to the far end of the chart) across its own multi-render internal state updates
  // — a one-off correction loses that race unpredictably, so a 'scroll' listener corrects it back
  // to 0 every time the library moves it, for as long as a window is active. Clamping already puts
  // window.start at the left edge of the (cropped) chart, so 0 is always the right answer here.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window) return;
    const container = containerRef.current;
    if (!container) return;
    const scroller = Array.from(container.querySelectorAll<HTMLElement>("div")).find(
      (d) => d.scrollWidth > d.clientWidth + 1,
    );
    if (!scroller) return;
    scroller.scrollLeft = 0;
    function onScroll() {
      if (scroller!.scrollLeft !== 0) scroller!.scrollLeft = 0;
    }
    scroller.addEventListener("scroll", onScroll);
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [rows, window]);

  if (rows.length === 0) {
    return <p className="py-[56px] text-center text-[13px] text-gca-show">No schedule tasks to show.</p>;
  }

  // gantt-task-react's Day view always pads 1 day before the first task's start and ~19 days past
  // the last task's end (hardcoded in its date-range calculation — preStepsCount=0 to remove the
  // leading pad crashes the library, so it's left in place). The trailing padding is harmless with
  // no window, but a 2-week lookahead must not show it, so the viewport is cropped to exactly the
  // window plus that one unavoidable leading day. viewDate must be set to window.start (not
  // omitted) when a window is active: the library only resets its internal scroll position when
  // viewDate actually changes, so an undefined viewDate here would leave the full-schedule view's
  // scroll position in place instead of scrolling back to the start of the cropped window.
  return (
    <div
      ref={containerRef}
      className={`rounded-[12px] border border-gca-border bg-white [&_.gantt-task-react]:font-sans ${window ? "overflow-y-auto overflow-x-hidden" : "overflow-auto"}`}
      style={{
        maxHeight: HEADER_HEIGHT + GANTT_HEIGHT + 2,
        maxWidth: window ? LIST_WIDTH + (LOOKAHEAD_DAYS + 1) * COLUMN_WIDTH : undefined,
      }}
    >
      <Gantt
        tasks={rows}
        viewMode={ViewMode.Day}
        viewDate={window ? window.start : today}
        rowHeight={ROW_HEIGHT}
        headerHeight={HEADER_HEIGHT}
        columnWidth={COLUMN_WIDTH}
        listCellWidth={`${LIST_WIDTH}px`}
        todayColor="rgba(180, 35, 24, 0.08)"
        barCornerRadius={4}
        fontFamily="inherit"
        fontSize="13px"
        milestoneBackgroundColor="var(--gca-green)"
        onExpanderClick={(task) =>
          setCollapsed((prev) => {
            const next = new Set(prev);
            if (task.hideChildren) next.add(task.id);
            else next.delete(task.id);
            return next;
          })
        }
        TaskListHeader={() => (
          <div
            className="flex items-center border-b border-gca-border bg-white text-[12px] font-medium text-gca-muted"
            style={{ height: HEADER_HEIGHT }}
          >
            <span style={{ width: TASK_COL }} className="px-[16px]">
              Task
            </span>
            <span style={{ width: PROGRESS_COL }}>Progress</span>
            <span style={{ width: WORKDAYS_COL }}>Work days</span>
          </div>
        )}
        TaskListTable={({ tasks: listTasks, onExpanderClick }) => (
          <div>
            {(listTasks as GanttTask[]).map((t) => {
              const source = byId.get(t.id);
              const isGroup = t.type === "project";
              return (
                <div
                  key={t.id}
                  className="flex items-center border-b border-gca-border"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span
                    style={{ width: TASK_COL, paddingLeft: isGroup ? 16 : 32 }}
                    className={`flex items-center gap-[8px] truncate pr-[8px] text-[13px] ${
                      isGroup ? "font-semibold text-gca-dark" : "font-medium text-gca-dark"
                    }`}
                  >
                    {isGroup && (
                      <button
                        type="button"
                        onClick={() => onExpanderClick(t)}
                        className="cursor-pointer text-gca-muted"
                        aria-label={t.hideChildren ? "Expand" : "Collapse"}
                      >
                        {t.hideChildren ? "▸" : "▾"}
                      </button>
                    )}
                    <span className="truncate" title={t.name}>
                      {t.name}
                    </span>
                  </span>
                  <span style={{ width: PROGRESS_COL }} className="flex items-center gap-[6px] text-[13px] text-gca-dark">
                    <ProgressRing pct={t.progress} />
                    {Math.round(t.progress)}%
                  </span>
                  <span style={{ width: WORKDAYS_COL }} className="font-mono text-[13px] text-gca-dark">
                    {source ? workDays(source.duration_minutes) : 0}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      />
    </div>
  );
}
