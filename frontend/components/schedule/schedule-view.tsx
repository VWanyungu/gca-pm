"use client";

import { useMemo, useState } from "react";
import { Download, Search, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useProjectTeam,
  useSidebarCounts,
} from "@/components/project-overview/use-project-data";
import Dropdown from "@/components/Dropdown";
import { RiskForm } from "@/components/risks/risk-form";
import { GanttChart } from "./gantt-chart";
import { ScheduleTable } from "./schedule-table";
import { OverdueTasksView } from "./overdue-tasks-view";
import { ReconciliationFlagsView } from "./reconciliation-flags-view";
import { ScheduleHistoryView } from "./schedule-history-view";
import { VersionChangesView } from "./version-changes-view";
import { UploadScheduleForm, type UploadDraft } from "./upload-schedule-form";
import { UploadProcessingBanner } from "./upload-processing-banner";
import { UploadResultView } from "./upload-outcome-views";
import {
  useOverdueTasks,
  useReconciliationFlags,
  useScheduleInvalidate,
  useScheduleTasks,
  useScheduleVersions,
} from "./use-schedule-data";
import { formatShortDate, taskInWindow, type OverdueTask, type ScheduleVersion } from "./types";
import type { TeamMember } from "@/components/project-overview/types";

type Tab = "gantt" | "table" | "overdue" | "reconciliation";
type SubView =
  | { mode: "list" }
  | { mode: "new-risk"; task: OverdueTask }
  | { mode: "history" }
  | { mode: "version-changes"; version: ScheduleVersion }
  | { mode: "upload-form" }
  | { mode: "upload-result"; fileName: string; uploadedAt: string };

function uploaderName(userId: string | undefined, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

function twoWeeksFrom(date: Date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 13);
  return end;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ScheduleView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const { data: versions = [] } = useScheduleVersions(projectId);
  const { data: tasks = [] } = useScheduleTasks(projectId);
  const { data: overdue = [] } = useOverdueTasks(projectId);
  const { data: flags = [] } = useReconciliationFlags(projectId);

  const [tab, setTab] = useState<Tab>("gantt");
  const [range, setRange] = useState<"full" | "lookahead">("full");
  const [search, setSearch] = useState("");
  const [subView, setSubView] = useState<SubView>({ mode: "list" });
  const [uploadProcessing, setUploadProcessing] = useState<{ fileName: string; fileSizeLabel: string } | null>(null);
  const invalidate = useScheduleInvalidate(projectId);

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });
  const currentVersion = versions[0];

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    const matches = new Set(tasks.filter((t) => t.task_name.toLowerCase().includes(q)).map((t) => t.task_id));
    // Keep a matched task's ancestor groups so the hierarchy still makes sense.
    const byId = new Map(tasks.map((t) => [t.task_id, t]));
    for (const t of tasks) {
      if (!matches.has(t.task_id)) continue;
      let parent = t.parent_task_id ? byId.get(t.parent_task_id) : undefined;
      while (parent) {
        matches.add(parent.task_id);
        parent = parent.parent_task_id ? byId.get(parent.parent_task_id) : undefined;
      }
    }
    return tasks.filter((t) => matches.has(t.task_id));
  }, [tasks, search]);

  const lookaheadWindow = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { start, end: twoWeeksFrom(start) };
  }, []);

  const lookaheadSummary = useMemo(() => {
    if (range !== "lookahead") return null;
    const leaves = filteredTasks.filter((t) => !t.is_summary && taskInWindow(t, lookaheadWindow));
    return {
      tasks: leaves.filter((t) => !t.is_milestone).length,
      milestones: leaves.filter((t) => t.is_milestone).length,
      overdueCarried: leaves.filter((t) => t.is_overdue).length,
    };
  }, [range, filteredTasks, lookaheadWindow]);

  if (!project) return null;

  if (subView.mode === "new-risk") {
    const t = subView.task;
    return (
      <div className="flex min-h-[calc(100vh-64px)] w-full">
        <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="schedule" />
        <div className="flex w-full justify-center">
          <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
            <RiskForm
              projectId={projectId}
              projectName={project.project.name}
              stages={project.stages}
              team={team}
              initial={{
                title: `Overdue: ${t.task_name}`,
                description: `Expected finish was ${formatShortDate(t.expected_finish)}. The task is ${Math.round(Number(t.pct_work_complete))}% complete.`,
                subtitle: `From schedule task ${t.wbs} · ${t.task_name}`,
              }}
              onDone={() => setSubView({ mode: "list" })}
              onCancel={() => setSubView({ mode: "list" })}
            />
          </main>
        </div>
      </div>
    );
  }

  if (subView.mode === "history" || subView.mode === "version-changes" || subView.mode === "upload-form" || subView.mode === "upload-result") {
    return (
      <div className="flex min-h-[calc(100vh-64px)] w-full">
        <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="schedule" />
        <div className="flex w-full justify-center">
          <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
            {subView.mode === "history" && (
              <ScheduleHistoryView
                projectId={projectId}
                team={team}
                canManage={canManage}
                onBack={() => setSubView({ mode: "list" })}
                onUpload={() => setSubView({ mode: "upload-form" })}
                onViewChanges={(version) => setSubView({ mode: "version-changes", version })}
              />
            )}
            {subView.mode === "version-changes" && (
              <VersionChangesView
                projectId={projectId}
                version={subView.version}
                team={team}
                onBack={() => setSubView({ mode: "history" })}
              />
            )}
            {subView.mode === "upload-form" && (
              <UploadScheduleForm
                currentVersion={currentVersion}
                team={team}
                onCancel={() => setSubView({ mode: "list" })}
                onSubmit={(draft: UploadDraft) => {
                  setUploadProcessing({ fileName: draft.file.name, fileSizeLabel: formatFileSize(draft.file.size) });
                  setSubView({ mode: "list" });
                }}
              />
            )}
            {subView.mode === "upload-result" && (
              <UploadResultView
                fileName={subView.fileName}
                uploadedAt={subView.uploadedAt}
                taskCount={tasks.filter((t) => !t.is_summary).length}
                overdueCount={overdue.length}
                flagCount={flags.filter((f) => !f.acknowledged_at).length}
                onViewChanges={() =>
                  currentVersion
                    ? setSubView({ mode: "version-changes", version: currentVersion })
                    : setSubView({ mode: "history" })
                }
                onViewSchedule={() => setSubView({ mode: "list" })}
              />
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="schedule" />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          <div className="flex w-full items-center justify-between">
            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Schedule</h1>
              {currentVersion ? (
                <button
                  onClick={() => setSubView({ mode: "history" })}
                  className="mt-[2px] cursor-pointer text-[13px] text-gca-show hover:text-gca-green hover:underline"
                >
                  v{currentVersion.version_no} (current) · uploaded {formatShortDate(currentVersion.uploaded_at)} by{" "}
                  {uploaderName(currentVersion.uploaded_by, team)} · {tasks.filter((t) => !t.is_summary).length} tasks
                </button>
              ) : (
                <p className="mt-[2px] text-[13px] text-gca-show">No schedule uploaded yet</p>
              )}
            </div>
            <div className="flex items-center gap-[12px]">
              <button
                disabled
                title="Downloading the original upload needs the schedule file service — coming soon"
                className="flex size-[40px] cursor-not-allowed items-center justify-center rounded-[8px] border border-gca-border opacity-50"
                aria-label="Download schedule"
              >
                <Download className="size-[16px] text-gca-dark" />
              </button>
              {canManage && (
                <button
                  onClick={() => setSubView({ mode: "upload-form" })}
                  className="cursor-pointer flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
                >
                  <Upload className="size-[14px]" />
                  Upload schedule
                </button>
              )}
            </div>
          </div>

          {uploadProcessing && (
            <UploadProcessingBanner
              fileName={uploadProcessing.fileName}
              fileSizeLabel={uploadProcessing.fileSizeLabel}
              onCancel={() => setUploadProcessing(null)}
              onComplete={() => {
                const fileName = uploadProcessing.fileName;
                setUploadProcessing(null);
                invalidate();
                setSubView({ mode: "upload-result", fileName, uploadedAt: new Date().toISOString() });
              }}
            />
          )}

          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-[4px] border-b border-gca-border">
              {([
                { id: "gantt", label: "Gantt" },
                { id: "table", label: "Table" },
                { id: "overdue", label: "Overdue", count: overdue.length },
                { id: "reconciliation", label: "Reconciliation flags", count: flags.filter((f) => !f.acknowledged_at).length },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`cursor-pointer flex items-center gap-[6px] border-b-2 px-[4px] pb-[10px] text-[14px] ${
                    tab === t.id
                      ? "border-gca-green font-semibold text-gca-dark"
                      : "border-transparent font-medium text-gca-show"
                  }`}
                >
                  {t.label}
                  {"count" in t && t.count > 0 && (
                    <span className={tab === t.id ? "text-gca-dark" : "text-error-text"}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-[12px]">
              {(tab === "gantt" || tab === "table") && (
                <Dropdown
                  id="schedule-range"
                  data={[
                    { id: "full", name: "Full schedule" },
                    { id: "lookahead", name: `Next 2 weeks · from ${formatShortDate(lookaheadWindow.start.toISOString())}` },
                  ]}
                  selectedId={range}
                  style="h-[36px] w-[220px] rounded-[8px] border border-gca-border px-[13px] text-[13px]"
                  onSelect={(id) => setRange(id as "full" | "lookahead")}
                />
              )}
              {(tab === "gantt" || tab === "table") && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-[12px] top-1/2 size-[14px] -translate-y-1/2 text-gca-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks"
                    className="h-[36px] w-[220px] rounded-[8px] border border-gca-border pl-[34px] pr-[13px] text-[13px] outline-none focus:border-gca-green"
                  />
                </div>
              )}
            </div>
          </div>

          {(tab === "gantt" || tab === "table") && lookaheadSummary && (
            <div className="rounded-[8px] bg-gca-badge-bg px-[16px] py-[12px] text-[13px] text-gca-badge-text">
              <span className="font-semibold">
                Next 2 weeks · {formatShortDate(lookaheadWindow.start.toISOString())} – {formatShortDate(lookaheadWindow.end.toISOString())}
              </span>{" "}
              · {lookaheadSummary.tasks} tasks · {lookaheadSummary.milestones} milestone
              {lookaheadSummary.milestones === 1 ? "" : "s"} · {lookaheadSummary.overdueCarried} overdue carried over
            </div>
          )}

          {tab === "gantt" && (
            <GanttChart tasks={filteredTasks} window={range === "lookahead" ? lookaheadWindow : undefined} />
          )}
          {tab === "table" && (
            <ScheduleTable tasks={filteredTasks} window={range === "lookahead" ? lookaheadWindow : undefined} />
          )}
          {tab === "overdue" && (
            <OverdueTasksView
              projectId={projectId}
              tasks={overdue}
              allTasks={tasks}
              onAddAsRisk={(task) => setSubView({ mode: "new-risk", task })}
            />
          )}
          {tab === "reconciliation" && (
            <ReconciliationFlagsView projectId={projectId} flags={flags} allTasks={tasks} team={team} />
          )}
        </main>
      </div>
    </div>
  );
}
