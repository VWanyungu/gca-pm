"use client";

import { useState } from "react";
import Link from "next/link";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useProjectTeam,
  useSidebarCounts,
} from "@/components/project-overview/use-project-data";
import { useWeeklySubmission } from "./use-weekly-submission-data";
import { useWeeklyReportData } from "./use-weekly-report-data";
import { WeeklyReportDocument } from "./weekly-report-document";
import { SendToClientView } from "./send-to-client-view";
import { formatWeekPeriod, weekNumber } from "./types";
import { ArrowLeft, Download, SendIcon } from "lucide-react";

export function SubmissionViewer({
  projectId,
  submissionId,
}: {
  projectId: string;
  submissionId: string;
}) {
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const { data: submission } = useWeeklySubmission(projectId, submissionId);
  const {
    weekDprs,
    submittedDprCount,
    lateDprCount,
    dprDetailsFailed,
    photos,
    totalCandidatePhotos,
    previousWeekActualPct,
    previousSpi,
    previousWeekStart,
    topRisk,
    forecastFinish,
    lookaheadTasks,
    weekAmendmentsCount,
    expectedDprDays,
    allowableWorkingDays,
  } = useWeeklyReportData(projectId, submission);
  const [sending, setSending] = useState(false);

  if (!project || !submission) return null;

  function printReport() {
    if (!submission) return;
    // Chrome names the PDF after the document title.
    const previousTitle = document.title;
    document.title = `week-${weekNumber(submission.week_start)}-report`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  if (sending) {
    return (
      <div className="flex w-full justify-center p-[40px]">
        <div className="w-full max-w-[1200px]">
          <SendToClientView
            projectId={projectId}
            projectName={project.project.name}
            submission={submission}
            onBack={() => setSending(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar
        projectId={projectId}
        stages={project.stages}
        counts={counts}
        active="submit"
      />
      <div className="flex w-full justify-center p-[40px]">
        <div className="flex w-full max-w-[1200px] flex-col gap-[16px]">
          <Link
            href={`/projects/${projectId}/weekly-submission`}
            className="w-fit text-[13px] font-medium text-gca-green flex gap-[6px] items-center"
          >
            <ArrowLeft size={18} /> Register
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.3px] text-gca-dark">
                Week {weekNumber(submission.week_start)} 
                {/* · {formatWeekPeriod(submission.week_start)} */}
              </h1>
            </div>
            <div className="flex gap-[12px]">
              <button
                onClick={printReport}
                className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[8px] py-[8px] text-[13px] font-medium text-gca-dark"
                title="Save as PDF"
              >
                <Download size={18} />
              </button>
              <button
                onClick={() => setSending(true)}
                className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[14px] py-[8px] text-[13px] font-medium text-gca-dark flex gap-[6px] items-center"
              >
                <SendIcon size={18} /> Send to client
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-gca-border">
            <WeeklyReportDocument
              project={project.project}
              weekPeriod={formatWeekPeriod(submission.week_start)}
              submission={submission}
              team={team}
              weekDprs={weekDprs}
              submittedDprCount={submittedDprCount}
              lateDprCount={lateDprCount}
              dprDetailsFailed={dprDetailsFailed}
              photos={photos}
              totalCandidatePhotos={totalCandidatePhotos}
              previousWeekActualPct={previousWeekActualPct}
              previousSpi={previousSpi}
              previousWeekStart={previousWeekStart}
              topRisk={topRisk}
              forecastFinish={forecastFinish}
              lookaheadTasks={lookaheadTasks}
              weekAmendmentsCount={weekAmendmentsCount}
              expectedDprDays={expectedDprDays}
              allowableWorkingDays={allowableWorkingDays}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
