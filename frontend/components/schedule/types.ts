export interface ScheduleVersion {
  schedule_version_id: string;
  project_id: string;
  version_no: number | null;
  status: string;
  upload_kind: string;
  status_date: string | null;
  source_file_id: string;
  tasks_added: number | null;
  tasks_removed: number | null;
  tasks_modified: number | null;
  pct_overwrites: number | null;
  overdue_task_count: number | null;
  uploaded_by: string;
  uploaded_at: string;
  applied_at: string | null;
  notes: string | null;
  parse_diagnostics?: ParseDiagnostic[] | null;
}

/** What the parser reported about a file it refused (AC-SCH-04). */
export interface ParseDiagnostic {
  mpp_unique_id?: number;
  field?: string;
  message: string;
}

/** What the upload form offers, and the value each choice stores (AC-SCH-07). */
export type ScopeMode = "every_task" | "milestones_only" | "current_stage";

/** Current revision of a schedule task. Read-only client-side; uploads/edits happen via the (future) MPP parser. */
export interface ScheduleTask {
  task_id: string;
  mpp_unique_id: number;
  parent_task_id: string | null;
  outline_level: number;
  wbs: string | null;
  task_name: string;
  duration_minutes: number;
  start: string;
  expected_finish: string;
  actual_start: string | null;
  actual_finish: string | null;
  pct_work_complete: string;
  planned_pct_complete: string;
  is_milestone: boolean;
  is_summary: boolean;
  is_critical: boolean;
  predecessors: number[];
  resource_names: string[];
  responsible_user_id: string | null;
  is_overdue: boolean;
  /** Where this task should be today per its baseline dates; null if not yet baselined. */
  planned_pct: string | null;
}

export interface OverdueTask extends ScheduleTask {
  risk_id: string | null;
  risk_status: string | null;
}

/**
 * Whether the task's risk still stands for it. A closed risk — whether the PM closed it or it
 * closed itself once the task caught up — no longer speaks for the task, so the PM can raise a
 * fresh one if it falls overdue again.
 */
export function hasOpenRisk(task: OverdueTask): boolean {
  return task.risk_status === "open";
}

/** Shown next to the button that offers to raise another risk, once the previous one closed. */
export function spentRiskLabel(): string {
  return "Previous risk closed";
}

export interface VersionChange {
  task_id: string;
  task_name: string;
  wbs: string | null;
  change_type: "added" | "modified" | "restored";
  field: "Task" | "Start" | "Finish" | "Updated" | null;
  change: string;
}

export interface ReconciliationFlag {
  flag_id: string;
  task_id: string;
  mpp_unique_id: number;
  task_name: string;
  dpr_pct: string;
  schedule_pct: string;
  reported_by: string | null;
  reported_at: string;
  created_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
}

/** A rotating palette for topics — the uploaded schedule defines its own top-level topics
 *  (Milestones, Constraints, Preliminaries and Mobilization, Procurement, ...), not a fixed
 *  set of PDM stages, so colors are assigned by position, never by matching a topic's name. */
const TOPIC_PALETTE = [
  "var(--gca-teal)",
  "var(--gca-green)",
  "var(--gca-warning)",
  "var(--gca-blue)",
  "var(--gca-purple)",
  "var(--gca-slate)",
];

/** Color by the topic's position in topicOrder(); overdue always wins. */
export function barColor(task: ScheduleTask, topicIndex: number): string {
  if (task.is_overdue) return "var(--error-text)";
  if (topicIndex < 0) return "var(--gca-muted)";
  return TOPIC_PALETTE[topicIndex % TOPIC_PALETTE.length];
}

export function workDays(durationMinutes: number): number {
  return Math.round(durationMinutes / 480);
}

export function daysLate(expectedFinish: string): number {
  const ms = Date.now() - new Date(expectedFinish).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function formatLongDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

/** Every non-summary task under a group, at any depth — not just its direct children, so a
 *  nested group's rollup reflects real work instead of a sub-group's own (possibly stale)
 *  stored %. Mirrors refreshProjectMetrics' own leaf selection (AC-SCH-30/31). */
function leafDescendants(group: ScheduleTask, allTasks: ScheduleTask[]): ScheduleTask[] {
  const childrenByParent = new Map<string, ScheduleTask[]>();
  for (const t of allTasks) {
    if (!t.parent_task_id) continue;
    const list = childrenByParent.get(t.parent_task_id);
    if (list) list.push(t);
    else childrenByParent.set(t.parent_task_id, [t]);
  }
  const leaves: ScheduleTask[] = [];
  function walk(taskId: string) {
    for (const child of childrenByParent.get(taskId) ?? []) {
      if (child.is_summary) walk(child.task_id);
      else leaves.push(child);
    }
  }
  walk(group.task_id);
  return leaves;
}

/** A stage/topic's progress: the duration-weighted average of its leaf descendants' progress
 *  (AC-SCH-31), never a stored value — so milestones (zero duration) don't skew it and a long
 *  task barely started outweighs several short finished ones, same as the project-wide metric. */
export function groupProgress(group: ScheduleTask, allTasks: ScheduleTask[]): number {
  const leaves = leafDescendants(group, allTasks);
  if (leaves.length === 0) return Number(group.pct_work_complete);
  const totalWeight = leaves.reduce((sum, t) => sum + t.duration_minutes, 0);
  if (totalWeight === 0) {
    return leaves.reduce((sum, t) => sum + Number(t.pct_work_complete), 0) / leaves.length;
  }
  return (
    leaves.reduce((sum, t) => sum + t.duration_minutes * Number(t.pct_work_complete), 0) / totalWeight
  );
}

/** Symmetric with groupProgress: a stage's planned % is the duration-weighted average of its
 *  leaf descendants' planned %. */
export function groupPlannedProgress(group: ScheduleTask, allTasks: ScheduleTask[]): number | null {
  const leaves = leafDescendants(group, allTasks).filter((t) => t.planned_pct !== null);
  if (leaves.length === 0) return group.planned_pct !== null ? Number(group.planned_pct) : null;
  const totalWeight = leaves.reduce((sum, t) => sum + t.duration_minutes, 0);
  if (totalWeight === 0) {
    return leaves.reduce((sum, t) => sum + Number(t.planned_pct), 0) / leaves.length;
  }
  return (
    leaves.reduce((sum, t) => sum + t.duration_minutes * Number(t.planned_pct), 0) / totalWeight
  );
}

/**
 * The outline level the project's phases live at.
 *
 * Planners usually wrap the whole schedule in one level-1 row named after the project, which
 * makes level 2 the level people mean by "the phases" — Milestones, Procurement, Construction.
 * A file written without that wrapper has its phases at level 1. The first level holding more
 * than one task is the phase level in both shapes.
 */
export function phaseLevel(allTasks: ScheduleTask[]): number {
  const counts = new Map<number, number>();
  for (const t of allTasks) counts.set(t.outline_level, (counts.get(t.outline_level) ?? 0) + 1);
  const levels = [...counts.keys()].sort((a, b) => a - b);
  return levels.find((level) => (counts.get(level) ?? 0) > 1) ?? levels[0] ?? 1;
}

/** Walks parent_task_id up to the task's phase — the ancestor at the phase level, or itself. */
export function phaseOf(
  task: ScheduleTask,
  byId: Map<string, ScheduleTask>,
  level: number,
): ScheduleTask | null {
  let current: ScheduleTask | undefined = task;
  while (current && current.outline_level > level) {
    current = current.parent_task_id ? byId.get(current.parent_task_id) : undefined;
  }
  return current?.outline_level === level ? current : null;
}

/** The phase name a task belongs to, for grouping and colouring. */
export function rootGroupName(
  task: ScheduleTask,
  byId: Map<string, ScheduleTask>,
  level: number,
): string | null {
  return phaseOf(task, byId, level)?.task_name ?? null;
}

/** The ordered list of phases as they appear in the current schedule (Milestones, Constraints,
 *  Preliminaries and Mobilization, Procurement, ...) — whatever the Planner's latest upload
 *  defines, in upload/WBS order. */
export function topicOrder(allTasks: ScheduleTask[]): string[] {
  const byId = new Map(allTasks.map((t) => [t.task_id, t]));
  const level = phaseLevel(allTasks);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const t of allTasks) {
    const name = rootGroupName(t, byId, level);
    if (name && !seen.has(name)) {
      seen.add(name);
      order.push(name);
    }
  }
  return order;
}

/** Groups items by their task's topic, in schedule order (see topicOrder), with ungrouped
 *  items (no resolvable topic) last under `null`. */
export function groupByTopic<T>(
  items: T[],
  taskIdOf: (item: T) => string,
  allTasks: ScheduleTask[],
): { group: string | null; items: T[] }[] {
  const byId = new Map(allTasks.map((t) => [t.task_id, t]));
  const level = phaseLevel(allTasks);
  const buckets = new Map<string | null, T[]>();
  for (const item of items) {
    const task = byId.get(taskIdOf(item));
    const group = task ? rootGroupName(task, byId, level) : null;
    const bucket = buckets.get(group);
    if (bucket) bucket.push(item);
    else buckets.set(group, [item]);
  }
  const order = [...topicOrder(allTasks), null];
  return order
    .filter((g) => buckets.has(g))
    .map((g) => ({ group: g, items: buckets.get(g)! }));
}

/** Depth-first flatten so each group is immediately followed by its own children,
 *  instead of plain mpp_unique_id order (which clusters all group headers before any leaf). */
export function orderForGanttDisplay(tasks: ScheduleTask[]): ScheduleTask[] {
  const childrenByParent = new Map<string, ScheduleTask[]>();
  const presentIds = new Set(tasks.map((t) => t.task_id));
  for (const t of tasks) {
    if (!t.parent_task_id) continue;
    const list = childrenByParent.get(t.parent_task_id);
    if (list) list.push(t);
    else childrenByParent.set(t.parent_task_id, [t]);
  }
  for (const siblings of childrenByParent.values()) siblings.sort(compareWbs);

  const result: ScheduleTask[] = [];
  function emit(t: ScheduleTask) {
    result.push(t);
    for (const child of childrenByParent.get(t.task_id) ?? []) emit(child);
  }
  for (const t of [...tasks].sort(compareWbs)) {
    if (!t.parent_task_id || !presentIds.has(t.parent_task_id)) emit(t);
  }
  return result;
}

/**
 * Orders siblings the way MS Project lists them: by WBS, compared segment by segment as
 * numbers so 1.10 follows 1.9 instead of 1.1. Unique IDs reflect the order rows were created
 * in the file, not where they sit in the plan — sorting by them puts phase 1.3 above 1.1.
 */
export function compareWbs(a: ScheduleTask, b: ScheduleTask): number {
  if (a.wbs && b.wbs) {
    const left = a.wbs.split(".");
    const right = b.wbs.split(".");
    for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
      const l = Number(left[i] ?? -1);
      const r = Number(right[i] ?? -1);
      if (Number.isNaN(l) || Number.isNaN(r)) break; // a non-numeric code: fall through
      if (l !== r) return l - r;
    }
    if (a.wbs !== b.wbs) return a.wbs.localeCompare(b.wbs);
  }
  return a.mpp_unique_id - b.mpp_unique_id;
}

export interface DateWindow {
  start: Date;
  end: Date;
}

/** Whether a task's own date range overlaps the window at all (used to decide which leaf
 *  tasks a lookahead filter keeps, in both the Gantt and the Table). */
export function taskInWindow(t: ScheduleTask, window: DateWindow): boolean {
  return new Date(t.expected_finish) >= window.start && new Date(t.start) <= window.end;
}

/** Clamps a date range to a window — used to cut bars at the lookahead's edges so the visible
 *  date axis is bounded to exactly the window, not the full extent of every overlapping task. */
export function clampToWindow(start: Date, end: Date, window: DateWindow): { start: Date; end: Date } {
  const clampedStart = start < window.start ? window.start : start;
  const clampedEnd = end > window.end ? window.end : end;
  return { start: clampedStart, end: clampedEnd < clampedStart ? clampedStart : clampedEnd };
}

export function taskStatusLabel(t: ScheduleTask): { label: string; className: string } {
  if (Number(t.pct_work_complete) >= 100) return { label: "Done", className: "text-gca-green" };
  if (t.is_overdue) return { label: "Overdue", className: "text-error-text" };
  if (Number(t.pct_work_complete) > 0) return { label: "In progress", className: "text-gca-green" };
  return { label: "Not started", className: "text-gca-show" };
}

/**
 * The rows a schedule view should show, depth-first so each group is followed by its own
 * children. With a window, leaves that fall outside it are dropped along with any group left
 * holding nothing — a two-week lookahead should not list empty phases.
 *
 * Shared by the Gantt and the Table so the two never disagree about what is in the schedule.
 */
export function visibleScheduleRows(tasks: ScheduleTask[], window?: DateWindow): ScheduleTask[] {
  if (!window) return orderForGanttDisplay(tasks);

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
  const hasSurvivingDescendant = (t: ScheduleTask): boolean =>
    survivingLeafIds.has(t.task_id) ||
    (childrenOf.get(t.task_id) ?? []).some(hasSurvivingDescendant);

  const kept = tasks.filter((t) =>
    t.is_summary ? hasSurvivingDescendant(t) : survivingLeafIds.has(t.task_id),
  );
  return orderForGanttDisplay(kept);
}

/** True when any ancestor of this task is collapsed, so the row should not be drawn. */
export function isHiddenByCollapse(
  task: ScheduleTask,
  byId: Map<string, ScheduleTask>,
  collapsed: Set<string>,
): boolean {
  let parentId = task.parent_task_id;
  while (parentId) {
    if (collapsed.has(parentId)) return true;
    parentId = byId.get(parentId)?.parent_task_id ?? null;
  }
  return false;
}
