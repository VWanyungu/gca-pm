"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjectDetail, useProjectTeam } from "@/components/project-overview/use-project-data";
import { useWeeklySubmission } from "./use-weekly-submission-data";
import { AddressedRiskRow } from "./addressed-risk-row";
import { SendToClientView } from "./send-to-client-view";
import { buildSubmissionReportText } from "./mailto";
import { formatWeekPeriod, weekNumber } from "./types";

export function SubmissionViewer({ projectId, submissionId }: { projectId: string; submissionId: string }) {
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: submission } = useWeeklySubmission(projectId, submissionId);
  const [sending, setSending] = useState(false);

  if (!project || !submission) return null;

  function exportReport() {
    const text = buildSubmissionReportText({
      submission: submission!,
      projectName: project!.project.name,
      addressedRisks: submission!.addressed_risks ?? [],
    });
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `week-${weekNumber(submission!.week_start)}-submission.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="flex w-full justify-center bg-gca-page-bg p-[40px]">
      <div className="flex w-full max-w-[1200px] flex-col gap-[16px]">
        <Link href={`/projects/${projectId}/weekly-submission`} className="w-fit text-[13px] font-medium text-gca-green">
          ← Weekly register
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.3px] text-gca-dark">
              Week {weekNumber(submission.week_start)} · {formatWeekPeriod(submission.week_start)}
            </h1>
          </div>
          <div className="flex gap-[12px]">
            <button
              onClick={exportReport}
              className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[14px] py-[8px] text-[13px] font-medium text-gca-dark"
            >
              Export report
            </button>
            <button
              onClick={() => setSending(true)}
              className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[14px] py-[8px] text-[13px] font-medium text-gca-dark"
            >
              Send to client
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-[20px] rounded-[12px] border border-gca-border bg-white p-[32px]">
          <div className="grid grid-cols-2 gap-[16px] text-[14px]">
            <div>
              <p className="text-[12px] text-gca-muted">Project</p>
              <p className="font-medium text-gca-dark">{project.project.name}</p>
            </div>
            <div>
              <p className="text-[12px] text-gca-muted">Submitted by</p>
              <p className="font-medium text-gca-dark">
                {submission.creator_name ?? "—"} ·{" "}
                {submission.approved_at
                  ? new Date(submission.approved_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                  : "Draft"}
              </p>
            </div>
          </div>

          {submission.planned_pct != null && (
            <div>
              <h3 className="mb-[12px] text-[16px] font-semibold text-gca-dark">Progress</h3>
              <div className="flex gap-[16px]">
                <ProgressTile label="Planned" value={`${submission.planned_pct}%`} />
                <ProgressTile label="Actual" value={`${submission.actual_pct}%`} />
                <ProgressTile label="SPI" value={submission.spi != null ? Number(submission.spi).toFixed(2) : "—"} />
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-[8px] text-[16px] font-semibold text-gca-dark">Commentary</h3>
            <p className="text-[14px] text-gca-show">{submission.pm_commentary || "—"}</p>
          </div>

          <div>
            <h3 className="mb-[4px] text-[16px] font-semibold text-gca-dark">Top risks and actions</h3>
            {(submission.addressed_risks ?? []).length === 0 ? (
              <p className="text-[13px] text-gca-muted">None recorded.</p>
            ) : (
              submission.addressed_risks!.map((risk, i) => (
                <AddressedRiskRow
                  key={risk.risk_id}
                  index={i + 1}
                  projectId={projectId}
                  addressedRisk={risk}
                  isMainTopRisk={risk.risk_id === submission.top_risk_id}
                  team={team}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px] rounded-[10px] bg-gca-page-bg px-[16px] py-[12px]">
      <p className="text-[12px] text-gca-muted">{label}</p>
      <p className="text-[20px] font-semibold text-gca-dark">{value}</p>
    </div>
  );
}
