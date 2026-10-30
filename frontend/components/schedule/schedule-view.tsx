"use client";

import { useMemo, useRef, useState } from "react";
import { Download, LoaderCircle, Search, Upload } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import useOutsideClick from "@/hooks/use-outside-click";
import { canAccess, CAN_MANAGE_PROJECT, CAN_UPLOAD_SCHEDULE } from "@/lib/access-control";
import { useProjectDetail, useProjectTeam } from "@/components/project-overview/use-project-data";
import Dropdown from "@/components/Dropdown";
import { MobileFilterToggle } from "@/components/mobile-filter-toggle";
import { RiskForm } from "@/components/risks/risk-form";
import { GanttChart } from "./gantt-chart";
import { ScheduleTable } from "./schedule-table";
import { OverdueTasksView } from "./overdue-tasks-view";
import { ReconciliationFlagsView } from "./reconciliation-flags-view";
import { ScheduleHistoryView } from "./schedule-history-view";
import { VersionChangesView } from "./version-changes-view";
import { UploadScheduleForm, type UploadDraft } from "./upload-schedule-form";
import { UploadProcessingBanner } from "./upload-processing-banner";
import { UploadResultView, UploadFailedView, type UploadProblem } from "./upload-outcome-views";
import {
  exportScheduleFile,
  useOverdueTasks,
  useReconciliationFlags,
  useScheduleInvalidate,
  useScheduleTasks,
  useScheduleVersions,
  useUploadSchedule,
} from "./use-schedule-data";
import {
  formatShortDate,
  taskInWindow,
  type OverdueTask,
  type ParseDiagnostic,
  type ScheduleVersion,
} from "./types";
import type { TeamMember } from "@/components/project-overview/types";

type Tab = "gantt" | "table" | "overdue" | "reconciliation";
type SubView =
  | { mode: "list" }
  | { mode: "new-risk"; task: OverdueTask }
  | { mode: "history" }
  | { mode: "version-changes"; version: ScheduleVersion }
  | { mode: "upload-form" }
  | { mode: "upload-result"; fileName: string; uploadedAt: string; version: ScheduleVersion }
  | {
      mode: "upload-failed";
      fileName: string;
      fileSizeLabel: string;
      uploadedAt: string;
      problems: UploadProblem[];
    };

function uploaderName(userId: string | undefined, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

function twoWeeksFrom(date: Date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 13);
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatFileSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** The parser reports a column and a message; the failure view wants a task, the problem and
 *  what to do about it. A diagnostic without a task id is about the file as a whole. */
function diagnosticsToProblems(diagnostics: ParseDiagnostic[]): UploadProblem[] {
  return diagnostics.map((d) => ({
    task: d.mpp_unique_id ? `Task ${d.mpp_unique_id}` : "This file",
    problem: d.message,
    howToFix: d.field
      ? `Set a valid ${d.field.replace(/_/g, " ")} in MS Project and upload again.`
      : "Fix this in MS Project and upload again.",
  }));
}

/** No report endpoint yet: hand the Planner the same list as a text file from the browser. */
function downloadProblemReport(fileName: string, problems: UploadProblem[]) {
  const lines = [
    `Upload problems for ${fileName}`,
    "",
    ...problems.map((p) => `- ${p.task}: ${p.problem} (${p.howToFix})`),
  ];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName.replace(/\.mpp$/i, "")}-upload-problems.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

/** A single-item action menu, not a persisted-selection control like Dropdown — clicking XML
 *  exports immediately rather than leaving "XML" stuck as the button's label. */
function ExportDropdown({
  onExportXml,
  disabled,
}: {
  onExportXml: () => Promise<void>;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick({ ref, handler: () => setIsOpen(false) });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        disabled={disabled || exporting}
        title={disabled ? "No schedule uploaded yet" : undefined}
        className="flex h-[40px] cursor-pointer items-center gap-[8px] rounded-[8px] border border-gca-border px-[16px] text-[14px] font-semibold text-gca-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? (
          <LoaderCircle className="size-[14px] animate-spin" aria-label="Exporting" />
        ) : (
          <Download className="size-[14px]" />
        )}
        Export
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-10 mt-[8px] min-w-[160px] rounded-[8px] border border-gca-border bg-gca-surface py-[6px] shadow-[0px_1px_10px_4px_rgba(23,48,31,0.08)]">
          <button
            onClick={async () => {
              setIsOpen(false);
              setExporting(true);
              try {
                await onExportXml();
              } finally {
                setExporting(false);
              }
            }}
            className="flex w-full cursor-pointer items-center px-[14px] py-[8px] text-left text-[13px] text-gca-dark hover:bg-gca-badge-bg"
          >
            XML (MS Project)
          </button>
        </div>
      )}
    </div>
  );
}

export function ScheduleView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: versions = [] } = useScheduleVersions(projectId);
  const { data: tasks = [] } = useScheduleTasks(projectId);
  const { data: overdue = [] } = useOverdueTasks(projectId);
  const { data: flags = [] } = useReconciliationFlags(projectId);

  const [tab, setTab] = useState<Tab>("table");
  const [range, setRange] = useState<"full" | "lookahead">("full");
  const [search, setSearch] = useState("");
  const [subView, setSubView] = useState<SubView>({ mode: "list" });
  const [uploadProcessing, setUploadProcessing] = useState<{
    versionId: string;
    fileName: string;
    fileSizeLabel: string;
  } | null>(null);
  const uploadSchedule = useUploadSchedule(projectId);
  const invalidate = useScheduleInvalidate(projectId);

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });
  const canUpload = canAccess(user?.role, CAN_UPLOAD_SCHEDULE, { projectId });
  const currentVersion = versions[0];

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.trim().toLowerCase();
    const matches = new Set(
      tasks.filter((t) => t.task_name.toLowerCase().includes(q)).map((t) => t.task_id),
    );
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
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
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
      <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
        <RiskForm
          projectId={projectId}
          projectName={project.project.name}
          stages={project.stages}
          team={team}
          initial={{
            title: `Overdue: ${t.task_name}`,
            description: `Expected finish was ${formatShortDate(t.expected_finish)}. The task is ${Math.round(Number(t.pct_work_complete))}% complete.`,
            subtitle: `From schedule task ${t.wbs} · ${t.task_name}`,
            sourceTaskId: t.task_id,
          }}
          onDone={() => {
            invalidate();
            setSubView({ mode: "list" });
          }}
          onCancel={() => setSubView({ mode: "list" })}
        />
      </main>
    );
  }

  if (
    subView.mode === "history" ||
    subView.mode === "version-changes" ||
    subView.mode === "upload-form" ||
    subView.mode === "upload-result" ||
    subView.mode === "upload-failed"
  ) {
    return (
      <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
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
            submitting={uploadSchedule.isPending}
            onSubmit={async (draft: UploadDraft) => {
              const result = await uploadSchedule.mutateAsync(draft);
              setUploadProcessing({
                versionId: result.schedule_version_id,
                fileName: draft.file.name,
                fileSizeLabel: formatFileSize(draft.file.size),
              });
              setSubView({ mode: "list" });
            }}
          />
        )}
        {subView.mode === "upload-failed" && (
          <UploadFailedView
            fileName={subView.fileName}
            fileSizeLabel={subView.fileSizeLabel}
            uploadedAt={subView.uploadedAt}
            problems={subView.problems}
            onDownloadReport={() => downloadProblemReport(subView.fileName, subView.problems)}
            onUploadAgain={() => setSubView({ mode: "upload-form" })}
          />
        )}
        {subView.mode === "upload-result" && (
          <UploadResultView
            fileName={subView.fileName}
            uploadedAt={subView.uploadedAt}
            taskCount={tasks.filter((t) => !t.is_summary).length}
            datesMoved={subView.version.tasks_modified ?? 0}
            overdueCount={subView.version.overdue_task_count ?? 0}
            flagCount={subView.version.pct_overwrites ?? 0}
            onViewChanges={() =>
              currentVersion
                ? setSubView({ mode: "version-changes", version: currentVersion })
                : setSubView({ mode: "history" })
            }
            onViewSchedule={() => setSubView({ mode: "list" })}
          />
        )}
      </main>
    );
  }

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
      <div className="flex w-full flex-col gap-[12px] md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Schedule</h1>
          {currentVersion ? (
            <button
              onClick={() => setSubView({ mode: "history" })}
              className="mt-[2px] cursor-pointer text-[13px] text-gca-show hover:text-gca-green hover:underline"
            >
              {/* v{currentVersion.version_no} (current) ·  */}
              Uploaded on {formatShortDate(currentVersion.uploaded_at)} by{" "}
              {uploaderName(currentVersion.uploaded_by, team)}
              {/* · {tasks.filter((t) => !t.is_summary).length} tasks */}
            </button>
          ) : (
            <p className="mt-[2px] text-[13px] text-gca-show">No schedule uploaded yet</p>
          )}
        </div>
        <div className="flex items-center gap-[12px]">
          <ExportDropdown
            disabled={!currentVersion}
            onExportXml={() => exportScheduleFile(projectId, project?.project.name ?? "schedule")}
          />
          {canUpload && (
            <button
              onClick={() => setSubView({ mode: "upload-form" })}
              className="cursor-pointer flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
            >
              <Upload className="size-[14px]" />
              Upload schedule
            </button>
          )}
        </div>
      </div>

      {uploadProcessing && (
        <UploadProcessingBanner
          projectId={projectId}
          versionId={uploadProcessing.versionId}
          fileName={uploadProcessing.fileName}
          fileSizeLabel={uploadProcessing.fileSizeLabel}
          onCancel={() => setUploadProcessing(null)}
          onComplete={(version) => {
            const fileName = uploadProcessing.fileName;
            setUploadProcessing(null);
            invalidate();
            setSubView({
              mode: "upload-result",
              fileName,
              uploadedAt: new Date().toISOString(),
              version,
            });
          }}
          onFailed={(diagnostics) => {
            const { fileName, fileSizeLabel } = uploadProcessing;
            setUploadProcessing(null);
            setSubView({
              mode: "upload-failed",
              fileName,
              fileSizeLabel,
              uploadedAt: new Date().toISOString(),
              problems: diagnosticsToProblems(diagnostics),
            });
          }}
        />
      )}

      <div className="flex w-full flex-col items-stretch gap-[12px] border-b border-gca-border md:flex-row md:items-center md:justify-between">
        <div className="no-scrollbar flex min-w-0 items-center gap-[4px] overflow-x-auto">
          {(
            [
              { id: "table", label: "Table" },
              { id: "gantt", label: "Gantt" },
              { id: "overdue", label: "Overdue", count: overdue.length },
              {
                id: "reconciliation",
                label: "Reconciliation flags",
                count: flags.filter((f) => !f.acknowledged_at).length,
              },
            ] as const
          ).map((t) => (
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
                <span className={tab === t.id ? "text-gca-dark" : "text-error-text"}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {(tab === "gantt" || tab === "table") && (
          <div className="pb-[10px]">
            <MobileFilterToggle>
              <div className="flex items-center gap-[12px]">
                <Dropdown
                  id="schedule-range"
                  data={[
                    { id: "full", name: "Full schedule" },
                    {
                      id: "lookahead",
                      name: `Next 2 weeks`,
                    },
                  ]}
                  selectedId={range}
                  style="h-[36px] w-full sm:w-[220px] rounded-[8px] border border-gca-border px-[13px] text-[13px]"
                  onSelect={(id) => setRange(id as "full" | "lookahead")}
                />
                <div className="relative">
                  <Search className="pointer-events-none absolute left-[12px] top-1/2 size-[14px] -translate-y-1/2 text-gca-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tasks"
                    className="h-[36px] w-full rounded-[8px] border border-gca-border pl-[34px] pr-[13px] text-[13px] outline-none focus:border-gca-green sm:w-[220px]"
                  />
                </div>
              </div>
            </MobileFilterToggle>
          </div>
        )}
      </div>

      {(tab === "gantt" || tab === "table") && lookaheadSummary && (
        <div className="rounded-[8px] bg-gca-badge-bg px-[16px] py-[12px] text-[13px] text-gca-badge-text flex justify-between items-center">
          <span className="font-semibold">
            {/* Next 2 weeks  ·*/} {formatShortDate(lookaheadWindow.start.toISOString())} –{" "}
            {formatShortDate(lookaheadWindow.end.toISOString())}
          </span>

          <span>
            {lookaheadSummary.tasks} tasks · {lookaheadSummary.milestones} milestone
            {lookaheadSummary.milestones === 1 ? "" : "s"} · {lookaheadSummary.overdueCarried}{" "}
            overdue carried over
          </span>
        </div>
      )}

      {tab === "gantt" && (
        <GanttChart
          tasks={filteredTasks}
          window={range === "lookahead" ? lookaheadWindow : undefined}
        />
      )}
      {tab === "table" && (
        <ScheduleTable
          key={`${range}:${search}`}
          tasks={filteredTasks}
          window={range === "lookahead" ? lookaheadWindow : undefined}
        />
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
  );
}
