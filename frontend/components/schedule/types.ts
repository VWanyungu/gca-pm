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
  overdue_risks_created: number | null;
  uploaded_by: string;
  uploaded_at: string;
  applied_at: string | null;
}

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

/** A stage/topic's progress is the average of its direct tasks' progress, not a stored value. */
export function groupProgress(group: ScheduleTask, allTasks: ScheduleTask[]): number {
  const children = allTasks.filter((t) => t.parent_task_id === group.task_id);
  if (children.length === 0) return Number(group.pct_work_complete);
  return children.reduce((sum, c) => sum + Number(c.pct_work_complete), 0) / children.length;
}

/** Symmetric with groupProgress: a stage's planned % is the average of its tasks' planned %. */
export function groupPlannedProgress(group: ScheduleTask, allTasks: ScheduleTask[]): number | null {
  const children = allTasks.filter((t) => t.parent_task_id === group.task_id);
  const withPlanned = children.filter((c) => c.planned_pct !== null);
  if (withPlanned.length === 0) return group.planned_pct !== null ? Number(group.planned_pct) : null;
  return withPlanned.reduce((sum, c) => sum + Number(c.planned_pct), 0) / withPlanned.length;
}

/** Walks parent_task_id up to the outermost summary row (the phase group: Procurement, etc). */
export function rootGroupName(task: ScheduleTask, byId: Map<string, ScheduleTask>): string | null {
  let current: ScheduleTask | undefined = task;
  while (current?.parent_task_id) {
    current = byId.get(current.parent_task_id);
  }
  return current?.is_summary ? current.task_name : null;
}

/** The ordered list of top-level topics as they appear in the current schedule (e.g. Milestones,
 *  Constraints, Preliminaries and Mobilization, Procurement, ...) — whatever the Planner's latest
 *  upload defines, in upload/WBS order. Nothing here assumes a fixed set of PDM-stage-like names. */
export function topicOrder(allTasks: ScheduleTask[]): string[] {
  const byId = new Map(allTasks.map((t) => [t.task_id, t]));
  const seen = new Set<string>();
  const order: string[] = [];
  for (const t of allTasks) {
    const name = rootGroupName(t, byId);
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
  const buckets = new Map<string | null, T[]>();
  for (const item of items) {
    const task = byId.get(taskIdOf(item));
    const group = task ? rootGroupName(task, byId) : null;
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

  const result: ScheduleTask[] = [];
  function emit(t: ScheduleTask) {
    result.push(t);
    for (const child of childrenByParent.get(t.task_id) ?? []) emit(child);
  }
  for (const t of tasks) {
    if (!t.parent_task_id || !presentIds.has(t.parent_task_id)) emit(t);
  }
  return result;
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
