"use client";

import { useState } from "react";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useProjectTeam,
  useSidebarCounts,
  useMilestones,
} from "@/components/project-overview/use-project-data";
import {
  useWeekSubmission,
  useWeeklySubmission,
  createWeeklySubmission,
  useWeeklySubmissionInvalidate,
} from "./use-weekly-submission-data";
import { SubmitMode } from "./submit-mode";
import { WeeklyRegisterTable } from "./weekly-register-table";
import { mondayOf, addDays, formatWeekPeriod, weekNumber, type SubmitTab } from "./types";

export function SubmitView({
  projectId,
  initialWeekStart,
}: {
  projectId: string;
  initialWeekStart?: string;
}) {
  const [tab, setTab] = useState<SubmitTab>("week");
  const [weekStart, setWeekStart] = useState(() =>
    initialWeekStart ? mondayOf(new Date(`${initialWeekStart}T12:00:00`)) : mondayOf(new Date()),
  );
  const isWeekTab = String(tab) === "week";
  const isRegisterTab = String(tab) === "register";

  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const { data: milestones = [] } = useMilestones(projectId);
  const { data: weekSubmission, isLoading } = useWeekSubmission(projectId, weekStart);
  // The week lookup uses the list endpoint, which doesn't include addressed_risks — fetch full details by id.
  const { data: draft } = useWeeklySubmission(projectId, weekSubmission?.draft?.submission_id);
  const { data: approved } = useWeeklySubmission(
    projectId,
    weekSubmission?.approved?.submission_id,
  );
  const invalidate = useWeeklySubmissionInvalidate(projectId);
  const [creating, setCreating] = useState(false);

  if (!project) return null;

  async function startWeek() {
    setCreating(true);
    await createWeeklySubmission(projectId, weekStart);
    invalidate();
    setCreating(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar
        projectId={projectId}
        stages={project.stages}
        counts={counts}
        active="submit"
      />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          {isRegisterTab && (
            <WeeklyRegisterTable
              projectId={projectId}
              weekStart={weekStart}
              tab={tab}
              setTab={setTab}
            />
          )}

          {isWeekTab && !isLoading && (
            <>
              {draft && (
                <SubmitMode
                  weekStart={weekStart}
                  tab={tab}
                  setTab={setTab}
                  projectId={projectId}
                  projectName={project.project.name}
                  submission={draft}
                  metrics={project.metrics}
                  milestones={milestones}
                  team={team}
                  onPrevWeek={() => setWeekStart((current) => addDays(current, -7))}
                  onNextWeek={() => setWeekStart((current) => addDays(current, 7))}
                />
              )}

              {!weekSubmission?.draft && weekSubmission?.approved && approved && (
                <SubmitMode
                  weekStart={weekStart}
                  tab={tab}
                  setTab={setTab}
                  projectId={projectId}
                  projectName={project.project.name}
                  submission={approved}
                  metrics={project.metrics}
                  milestones={milestones}
                  team={team}
                  viewSubmissionHref={`/projects/${projectId}/weekly-submission/${weekSubmission.approved.submission_id}`}
                  onPrevWeek={() => setWeekStart((current) => addDays(current, -7))}
                  onNextWeek={() => setWeekStart((current) => addDays(current, 7))}
                />
              )}

              {!weekSubmission?.draft && !weekSubmission?.approved && (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">
                        Week {weekNumber(weekStart)} submission
                      </h1>
                      <p className="mt-[2px] text-[13px] text-gca-show">
                        {formatWeekPeriod(weekStart)}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-fit gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
                    <button
                      onClick={() => setTab("week")}
                      className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                        isWeekTab
                          ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                          : "font-normal text-gca-show"
                      }`}
                    >
                      Week {weekNumber(weekStart)}
                    </button>
                    <button
                      onClick={() => setTab("register")}
                      className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                        isRegisterTab
                          ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                          : "font-normal text-gca-show"
                      }`}
                    >
                      Register
                    </button>
                  </div>

                  <div className="flex w-full flex-col items-start gap-[12px] rounded-[12px] border border-gca-border bg-gca-surface p-[32px]">
                    <h2 className="text-[18px] font-semibold text-gca-dark">
                      Start Week {weekNumber(weekStart)} submission
                    </h2>
                    <p className="text-[14px] text-gca-show">{formatWeekPeriod(weekStart)}</p>
                    <button
                      onClick={startWeek}
                      disabled={creating}
                      className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent disabled:opacity-50"
                    >
                      Start submission
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
