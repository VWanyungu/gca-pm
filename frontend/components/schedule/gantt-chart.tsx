"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Gantt, ViewMode, type Task as GanttTaskBase } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import {
  barColor,
  clampToWindow,
  groupProgress,
  isHiddenByCollapse,
  phaseLevel,
  plannedFinish,
  rootGroupName,
  topicOrder,
  visibleScheduleRows,
  workDays,
  type DateWindow,
  type ScheduleTask,
} from "./types";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";

type GanttTask = GanttTaskBase & { durationMinutes: number };

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 32;
const GANTT_HEIGHT = 520;
const TASK_COL = 300;
const PROGRESS_COL = 90;
const WORKDAYS_COL = 90;
const LIST_WIDTH = TASK_COL + PROGRESS_COL + WORKDAYS_COL;
const COLUMN_WIDTH = 44;
const LOOKAHEAD_DAYS = 14;
const SVG_NS = "http://www.w3.org/2000/svg";

function ProgressRing({ pct }: { pct: number }) {
  return (
    <span
      className="relative inline-flex size-[14px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--gca-green) ${pct * 3.6}deg, var(--gca-border) 0deg)`,
      }}
    >
      <span className="absolute inset-[2px] rounded-full bg-gca-surface" />
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
  const level = useMemo(() => phaseLevel(tasks), [tasks]);
  const baseLevel = useMemo(
    () => (tasks.length ? Math.min(...tasks.map((t) => t.outline_level)) : 1),
    [tasks],
  );

  const visible = useMemo(() => visibleScheduleRows(tasks, window), [tasks, window]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  // Stable across re-renders so the library's initial-scroll effect doesn't keep re-firing.
  const today = useMemo(() => new Date(), []);

  const rows = useMemo<GanttTask[]>(
    () =>
      visible.map((t) => {
        const groupName = rootGroupName(t, byId, level);
        const topicIndex = groupName ? topics.indexOf(groupName) : -1;
        const rawStart = new Date(t.start);
        const rawEnd = t.is_milestone ? rawStart : new Date(plannedFinish(t));
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
    [visible, byId, byMppId, topics, level, collapsed, window],
  );

  // Sourced from `rows` (clamped to `window`), not `visible`/raw task dates: an overdue task
  // carried into the "Next 2 weeks" lookahead can have a real start months in the past, which
  // previously threw off the week-number overlay and the "Today" scroll position — both need
  // the same clamped start the chart itself renders from.
  const displayedRows = useMemo(
    () => rows.filter((_, i) => !isHiddenByCollapse(visible[i], byId, collapsed)),
    [rows, visible, byId, collapsed],
  );
  const chartHeight = Math.min(GANTT_HEIGHT, displayedRows.length * ROW_HEIGHT);
  const handleExpanderClick = useCallback((task: GanttTaskBase) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (task.hideChildren) next.add(task.id);
      else next.delete(task.id);
      return next;
    });
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  function scrollToToday() {
    const container = containerRef.current;
    if (!container) return;

    const timelineScroller = Array.from(
      container.querySelectorAll<HTMLElement>('div[dir="ltr"]'),
    ).find(
      (element) =>
        getComputedStyle(element).overflowX === "auto" &&
        element.scrollWidth > element.clientWidth + 1,
    );
    if (!timelineScroller) return;

    const chartStart = new Date(
      Math.min(...displayedRows.map((task) => new Date(task.start).getTime())),
    );
    chartStart.setHours(0, 0, 0, 0);
    chartStart.setDate(chartStart.getDate() - 1);
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const chartStartDay = Date.UTC(
      chartStart.getFullYear(),
      chartStart.getMonth(),
      chartStart.getDate(),
    );
    const todayStartDay = Date.UTC(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      todayStart.getDate(),
    );
    const dayOffset = Math.floor((todayStartDay - chartStartDay) / 86_400_000);
    const todayPosition = Math.max(0, dayOffset * COLUMN_WIDTH + COLUMN_WIDTH / 2);
    timelineScroller.scrollLeft = Math.min(
      Math.max(0, todayPosition - timelineScroller.clientWidth / 2),
      timelineScroller.scrollWidth - timelineScroller.clientWidth,
    );
    timelineScroller.dispatchEvent(new Event("scroll", { bubbles: true }));
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const firstChartDate = new Date(
      Math.min(...displayedRows.map((task) => new Date(task.start).getTime())),
    );
    firstChartDate.setHours(0, 0, 0, 0);
    firstChartDate.setDate(firstChartDate.getDate() - 1);

    const getIsoWeek = (date: Date) => {
      const weekDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      weekDate.setUTCDate(weekDate.getUTCDate() + 4 - (weekDate.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(weekDate.getUTCFullYear(), 0, 1));
      return Math.ceil(((weekDate.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    };

    const showDayNumbers = () => {
      container.querySelectorAll<SVGTextElement>(".calendar > text").forEach((label) => {
        const day = label.textContent?.match(/^.+,\s*(\d{1,2})$/)?.[1];
        if (day && label.textContent !== day) label.textContent = day;
      });

      const calendar = container.querySelector<SVGGElement>(".calendar");
      const grid = container.querySelector<SVGGElement>(".grid");
      const dayLabels = calendar?.querySelectorAll<SVGTextElement>(":scope > text");
      if (!calendar || !grid || !dayLabels?.length) return;

      const calendarSvg = calendar.ownerSVGElement;
      const gridSvg = grid.ownerSVGElement;
      if (!calendarSvg || !gridSvg) return;

      const axisStart = firstChartDate.toISOString().slice(0, 10);
      const calendarAxisKey = `${axisStart}:${dayLabels.length}`;
      const oldCalendarOverlay = calendar.querySelector<SVGGElement>(".schedule-week-overlays");
      if (oldCalendarOverlay?.getAttribute("data-axis-key") !== calendarAxisKey) {
        oldCalendarOverlay?.remove();
        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("class", "schedule-week-overlays");
        group.setAttribute("data-axis-key", calendarAxisKey);

        const addLine = (x: number, y1: number, y2: number) => {
          const line = document.createElementNS(SVG_NS, "line");
          line.setAttribute("x1", String(x));
          line.setAttribute("x2", String(x));
          line.setAttribute("y1", String(y1));
          line.setAttribute("y2", String(y2));
          line.setAttribute("class", "schedule-week-divider");
          group.appendChild(line);
        };

        const count = dayLabels.length;
        const boundaries = [0];
        for (let index = 1; index < count; index++) {
          const date = new Date(firstChartDate);
          date.setDate(date.getDate() + index);
          if (date.getDay() === 1) boundaries.push(index);
        }
        boundaries.push(count);

        boundaries.forEach((index, boundaryIndex) => {
          addLine(index * COLUMN_WIDTH, 0, HEADER_HEIGHT);
          if (boundaryIndex === boundaries.length - 1) return;

          const endIndex = boundaries[boundaryIndex + 1];
          const date = new Date(firstChartDate);
          date.setDate(date.getDate() + index);
          const label = document.createElementNS(SVG_NS, "text");
          label.setAttribute("x", String(((index + endIndex) * COLUMN_WIDTH) / 2));
          label.setAttribute("y", "12");
          label.setAttribute("text-anchor", "middle");
          label.setAttribute("class", "schedule-week-label");
          label.textContent = `Week ${getIsoWeek(date)}`;
          group.appendChild(label);
        });
        calendar.appendChild(group);

        const bottomBorder = document.createElementNS(SVG_NS, "line");
        bottomBorder.setAttribute("x1", "0");
        bottomBorder.setAttribute("x2", String(dayLabels.length * COLUMN_WIDTH));
        bottomBorder.setAttribute("y1", String(HEADER_HEIGHT));
        bottomBorder.setAttribute("y2", String(HEADER_HEIGHT));
        bottomBorder.setAttribute("class", "schedule-calendar-bottom-border");
        group.appendChild(bottomBorder);
      }

      const gridHeight =
        gridSvg.viewBox.baseVal.height ||
        Number(gridSvg.getAttribute("height")) ||
        gridSvg.clientHeight;
      const gridAxisKey = `${calendarAxisKey}:${gridHeight}`;
      const oldGridOverlay = grid.querySelector<SVGGElement>(".schedule-week-overlays");
      if (oldGridOverlay?.getAttribute("data-axis-key") !== gridAxisKey) {
        oldGridOverlay?.remove();
        const group = document.createElementNS(SVG_NS, "g");
        group.setAttribute("class", "schedule-week-overlays");
        group.setAttribute("data-axis-key", gridAxisKey);
        group.setAttribute("pointer-events", "none");

        const count = dayLabels.length;
        const boundaries = [0];
        for (let index = 1; index < count; index++) {
          const date = new Date(firstChartDate);
          date.setDate(date.getDate() + index);
          if (date.getDay() === 1) boundaries.push(index);
        }
        boundaries.push(count);

        boundaries.forEach((index) => {
          const line = document.createElementNS(SVG_NS, "line");
          line.setAttribute("x1", String(index * COLUMN_WIDTH));
          line.setAttribute("x2", String(index * COLUMN_WIDTH));
          line.setAttribute("y1", "0");
          line.setAttribute("y2", String(gridHeight));
          line.setAttribute("class", "schedule-week-divider");
          group.appendChild(line);
        });
        grid.appendChild(group);
      }
    };

    showDayNumbers();
    const observer = new MutationObserver(showDayNumbers);
    observer.observe(container, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [displayedRows]);

  if (rows.length === 0) {
    return (
      <p className="py-[56px] text-center text-[13px] text-gca-show">No schedule tasks to show.</p>
    );
  }

  // gantt-task-react's Day view always pads 1 day before the first task's start and ~19 days past
  // the last task's end (hardcoded in its date-range calculation — preStepsCount=0 to remove the
  // leading pad crashes the library, so it's left in place). The lookahead viewport is cropped
  // to its requested width. viewDate must be set to window.start (not
  // omitted) when a window is active: the library only resets its internal scroll position when
  // viewDate actually changes, so an undefined viewDate here would leave the full-schedule view's
  // scroll position in place instead of scrolling back to the start of the cropped window.
  return (
    <div className="flex flex-col gap-[8px]">
      {!window && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={scrollToToday}
            className="flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] py-[7px] text-[13px] font-medium text-gca-dark hover:bg-gca-page-bg"
          >
            <CalendarDays className="size-[14px] text-gca-green" />
            Today
          </button>
        </div>
      )}
      <div
        ref={containerRef}
        className="schedule-gantt overflow-hidden bg-gca-surface [&_.gantt-task-react]:font-sans"
        style={{
          maxHeight: HEADER_HEIGHT + chartHeight + 20,
          maxWidth: window ? LIST_WIDTH + (LOOKAHEAD_DAYS + 1) * COLUMN_WIDTH : undefined,
        }}
      >
        <Gantt
          tasks={rows}
          viewMode={ViewMode.Day}
          viewDate={window ? window.start : today}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
          ganttHeight={chartHeight}
          columnWidth={COLUMN_WIDTH}
          listCellWidth={`${LIST_WIDTH}px`}
          todayColor="rgba(180, 35, 24, 0.08)"
          barCornerRadius={4}
          fontFamily="inherit"
          fontSize="13px"
          milestoneBackgroundColor="var(--gca-green)"
          onExpanderClick={handleExpanderClick}
          TaskListHeader={() => (
            <div
              className="flex items-center border-b border-gca-border bg-gca-surface text-[12px] font-medium text-gca-muted"
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
                const isPhase = source?.outline_level === level;
                const indent = source ? (source.outline_level - baseLevel) * 14 : 0;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center border-b border-gca-border ${isPhase ? "bg-gca-badge-bg" : ""}`}
                    style={{ height: ROW_HEIGHT }}
                  >
                    <span
                      style={{ width: TASK_COL, paddingLeft: 16 + indent }}
                      className={`flex items-center gap-[8px] truncate pr-[8px] text-[13px] ${
                        isPhase
                          ? "font-medium normal-case tracking-[0.04em] text-gca-badge-text"
                          : isGroup
                            ? "font-semibold text-gca-dark"
                            : "font-medium text-gca-dark"
                      }`}
                    >
                      {isGroup ? (
                        <button
                          type="button"
                          onClick={() => onExpanderClick(t)}
                          className="cursor-pointer text-gca-muted"
                          aria-label={t.hideChildren ? "Expand" : "Collapse"}
                        >
                          {t.hideChildren ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        </button>
                      ) : (
                        <span className="w-[10px]" aria-hidden />
                      )}
                      {/* MS Project lets a summary row carry the milestone flag too, so this is
                        drawn from the source row rather than from the bar type. */}
                      {source?.is_milestone && (
                        <span
                          className="shrink-0 text-[10px] text-gca-green"
                          title="Milestone"
                          aria-label="Milestone"
                        >
                          ◆
                        </span>
                      )}
                      <span className="truncate" title={t.name}>
                        {t.name}
                      </span>
                    </span>
                    <span
                      style={{ width: PROGRESS_COL }}
                      className="flex items-center gap-[6px] text-[13px] text-gca-dark"
                    >
                      <ProgressRing pct={t.progress} />
                      {Math.round(t.progress)}%
                    </span>
                    <span
                      style={{ width: WORKDAYS_COL }}
                      className="font-mono text-[13px] text-gca-dark"
                    >
                      {source ? workDays(source.duration_minutes) : 0}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        />
      </div>
    </div>
  );
}
