"use client";

import { useState } from "react";
import Link from "next/link";
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
import { mondayOf, formatWeekPeriod, weekNumber } from "./types";

type Tab = "week" | "register";

export function SubmitView({ projectId }: { projectId: string }) {
  const [tab, setTab] = useState<Tab>("week");
  const weekStart = mondayOf(new Date());

  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const { data: milestones = [] } = useMilestones(projectId);
  const { data: weekSubmission, isLoading } = useWeekSubmission(projectId, weekStart);
  // The week lookup uses the list endpoint, which doesn't include addressed_risks — fetch full details by id.
  const { data: draft } = useWeeklySubmission(projectId, weekSubmission?.draft?.submission_id);
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
      <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="submit" />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          <div className="flex w-fit gap-[4px] rounded-[8px] bg-gca-page-bg p-[3px]">
            <button
              onClick={() => setTab("week")}
              className={`cursor-pointer rounded-[6px] px-[14px] py-[7px] text-[13px] font-medium ${
                tab === "week" ? "bg-white text-gca-dark shadow-sm" : "text-gca-show"
              }`}
            >
              Week {weekNumber(weekStart)}
            </button>
            <button
              onClick={() => setTab("register")}
              className={`cursor-pointer rounded-[6px] px-[14px] py-[7px] text-[13px] font-medium ${
                tab === "register" ? "bg-white text-gca-dark shadow-sm" : "text-gca-show"
              }`}
            >
              Register
            </button>
          </div>

          {tab === "register" && <WeeklyRegisterTable projectId={projectId} />}

          {tab === "week" && !isLoading && (
            <>
              {draft && (
                <SubmitMode
                  projectId={projectId}
                  projectName={project.project.name}
                  submission={draft}
                  metrics={project.metrics}
                  milestones={milestones}
                  team={team}
                />
              )}

              {!weekSubmission?.draft && weekSubmission?.approved && (
                <div className="flex w-full flex-col items-start gap-[12px] rounded-[12px] border border-gca-border bg-white p-[32px]">
                  <h2 className="text-[18px] font-semibold text-gca-dark">
                    Week {weekNumber(weekStart)} is already submitted
                  </h2>
                  <p className="text-[14px] text-gca-show">{formatWeekPeriod(weekStart)}</p>
                  <Link
                    href={`/projects/${projectId}/weekly-submission/${weekSubmission.approved.submission_id}`}
                    className="text-[13px] font-medium text-gca-green"
                  >
                    View submission →
                  </Link>
                </div>
              )}

              {!weekSubmission?.draft && !weekSubmission?.approved && (
                <div className="flex w-full flex-col items-start gap-[12px] rounded-[12px] border border-gca-border bg-white p-[32px]">
                  <h2 className="text-[18px] font-semibold text-gca-dark">
                    Start Week {weekNumber(weekStart)} submission
                  </h2>
                  <p className="text-[14px] text-gca-show">{formatWeekPeriod(weekStart)}</p>
                  <button
                    onClick={startWeek}
                    disabled={creating}
                    className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Start submission
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
