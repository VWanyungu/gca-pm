"use client";

import { useRef, useState } from "react";
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
import { reportError } from "@/lib/toast";
import { ArrowLeft, Download, Loader2, SendIcon } from "lucide-react";

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
    photos,
    totalCandidatePhotos,
    previousWeekActualPct,
    lookaheadTasks,
    weekAmendmentsCount,
  } = useWeeklyReportData(projectId, submission);
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  if (!project || !submission) return null;

  async function generateAndDownloadReport() {
    if (!reportRef.current || !submission) return;
    setGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .from(reportRef.current)
        .set({
          margin: 0,
          filename: `week-${weekNumber(submission.week_start)}-report.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          // shortcut: html2pdf.js's bundled Html2PdfOptions type omits `pagebreak`, which the
          // library does support at runtime (see its README) — cast past the stale type.
          pagebreak: { mode: ["css"], before: ".report-page-break" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .save();
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Couldn't generate the report");
    } finally {
      setGenerating(false);
    }
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
                Week {weekNumber(submission.week_start)} · {formatWeekPeriod(submission.week_start)}
              </h1>
            </div>
            <div className="flex gap-[12px]">
              <button
                onClick={generateAndDownloadReport}
                disabled={generating}
                className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[8px] py-[8px] text-[13px] font-medium text-gca-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              </button>
              <button
                onClick={() => setSending(true)}
                className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[14px] py-[8px] text-[13px] font-medium text-gca-dark flex gap-[6px] items-center"
              >
                <SendIcon size={18} /> Send to client
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-gca-border bg-gca-page-bg p-[24px]">
            <WeeklyReportDocument
              ref={reportRef}
              project={project.project}
              submission={submission}
              team={team}
              weekDprs={weekDprs}
              photos={photos}
              totalCandidatePhotos={totalCandidatePhotos}
              previousWeekActualPct={previousWeekActualPct}
              lookaheadTasks={lookaheadTasks}
              weekAmendmentsCount={weekAmendmentsCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
