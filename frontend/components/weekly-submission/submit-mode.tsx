"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TeamMember, MetricRow, Milestone } from "@/components/project-overview/types";
import { NextMilestonesRow } from "@/components/project-overview/next-milestones-row";
import type { ScheduleVersion } from "@/components/schedule/types";
import { AddressedRiskRow } from "./addressed-risk-row";
import { AddFromRegisterForm } from "./add-from-register-form";
import { DprPhotosSection } from "./dpr-photos-section";
import { WeekDprStrip } from "./week-dpr-strip";
import {
  updateWeeklySubmission,
  approveWeeklySubmission,
  removeAddressedRisk,
  useWeeklySubmissionInvalidate,
} from "./use-weekly-submission-data";
import { buildMailto, buildSubmissionReportText, DEPARTMENT_LEAD_EMAIL } from "./mailto";
import type { WeeklySubmission } from "./types";
import { formatWeekPeriod, weekNumber } from "./types";

function useLatestScheduleVersion(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "versions", "latest"],
    queryFn: async () => {
      const res = await api.get<{ versions: ScheduleVersion[] }>(`/projects/${projectId}/schedule/versions`);
      if (res.status !== "success" || !res.data) return null;
      return res.data.versions[0] ?? null;
    },
    staleTime: 60_000,
  });
}

export function SubmitMode({
  projectId,
  projectName,
  submission,
  metrics,
  milestones,
  team,
}: {
  projectId: string;
  projectName: string;
  submission: WeeklySubmission;
  metrics: MetricRow[];
  milestones: Milestone[];
  team: TeamMember[];
}) {
  const invalidate = useWeeklySubmissionInvalidate(projectId);
  const { data: latestVersion } = useLatestScheduleVersion(projectId);
  const latestMetric = metrics[metrics.length - 1];

  const [commentary, setCommentary] = useState(submission.pm_commentary ?? "");
  const [addingRisk, setAddingRisk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function saveCommentary() {
    if (commentary === (submission.pm_commentary ?? "")) return;
    await updateWeeklySubmission(projectId, submission.submission_id, { pm_commentary: commentary });
    invalidate();
  }

  const addressedRisks = submission.addressed_risks ?? [];
  const checks = {
    progress: !!latestMetric,
    commentary: commentary.trim().length > 0,
    topRisks: addressedRisks.length > 0 && !!submission.top_risk_id,
  };
  const ready = checks.progress && checks.commentary && checks.topRisks;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const approved = await approveWeeklySubmission(projectId, submission.submission_id, {
        planned_pct: latestMetric?.planned_pct,
        actual_pct: latestMetric?.actual_pct,
        spi: latestMetric?.spi ?? null,
        rag: latestMetric?.rag ?? null,
        schedule_version_id: latestVersion?.schedule_version_id ?? null,
      });
      invalidate();

      if (DEPARTMENT_LEAD_EMAIL) {
        const mailto = buildMailto({
          to: [DEPARTMENT_LEAD_EMAIL],
          subject: `${projectName} — Week ${weekNumber(approved.week_start)} submission`,
          body: buildSubmissionReportText({
            submission: approved,
            projectName,
            addressedRisks: approved.addressed_risks ?? addressedRisks,
          }),
        });
        window.location.href = mailto;
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full gap-[32px]">
      <div className="flex w-full flex-col gap-[28px]">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.3px] text-gca-dark">
            Week {weekNumber(submission.week_start)} submission
          </h1>
          <p className="mt-[2px] text-[14px] text-gca-show">{formatWeekPeriod(submission.week_start)}</p>
        </div>

        <WeekDprStrip projectId={projectId} weekStart={submission.week_start} team={team} />

        {latestMetric && (
          <div className="flex w-full flex-col gap-[16px] rounded-[12px] border border-gca-border bg-white p-[24px]">
            <h3 className="text-[16px] font-semibold text-gca-dark">Progress</h3>
            <div className="flex gap-[40px]">
              <Tile label="Planned" value={`${Math.trunc(latestMetric.planned_pct)}%`} />
              <Tile label="Actual" value={`${Math.trunc(latestMetric.actual_pct)}%`} />
              <Tile label="SPI" value={latestMetric.spi?.toFixed(2) ?? "—"} />
            </div>
          </div>
        )}

        <div className="flex w-full flex-col gap-[12px] rounded-[12px] border border-gca-border bg-white p-[24px]">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-semibold text-gca-dark">Commentary</h3>
            <span className="font-mono text-[12px] text-gca-muted">{commentary.length} / 1,000</span>
          </div>
          <textarea
            value={commentary}
            onChange={(e) => setCommentary(e.target.value.slice(0, 1000))}
            onBlur={saveCommentary}
            rows={4}
            className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
          />
        </div>

        <div className="flex w-full flex-col gap-[4px] rounded-[12px] border border-gca-border bg-white p-[24px]">
          <div className="flex items-center justify-between pb-[12px]">
            <h3 className="text-[16px] font-semibold text-gca-dark">Top risks and actions</h3>
            {!addingRisk && (
              <button
                onClick={() => setAddingRisk(true)}
                className="cursor-pointer text-[13px] font-medium text-gca-green"
              >
                + Add from register
              </button>
            )}
          </div>

          {addingRisk && (
            <div className="pb-[16px]">
              <AddFromRegisterForm
                projectId={projectId}
                submissionId={submission.submission_id}
                alreadyAddressed={addressedRisks}
                onDone={() => setAddingRisk(false)}
                onCancel={() => setAddingRisk(false)}
              />
            </div>
          )}

          {addressedRisks.length === 0 ? (
            <p className="py-[12px] text-[13px] text-gca-muted">No top risks yet. Add from the register above.</p>
          ) : (
            addressedRisks.map((risk, i) => (
              <AddressedRiskRow
                key={risk.risk_id}
                index={i + 1}
                projectId={projectId}
                addressedRisk={risk}
                isMainTopRisk={risk.risk_id === submission.top_risk_id}
                team={team}
                onRemove={async () => {
                  await removeAddressedRisk(projectId, submission.submission_id, risk.risk_id);
                  invalidate();
                }}
              />
            ))
          )}
        </div>

        <DprPhotosSection projectId={projectId} submissionId={submission.submission_id} />

        <NextMilestonesRow projectId={projectId} milestones={milestones} />
      </div>

      <div className="w-[280px] shrink-0">
        <div className="sticky top-[88px] flex flex-col gap-[16px] rounded-[12px] bg-gca-page-bg p-[20px]">
          <h3 className="text-[15px] font-semibold text-gca-dark">Ready to submit?</h3>
          <ChecklistItem ok={checks.progress} label="Progress from this week's schedule" />
          <ChecklistItem ok={checks.commentary} label="Commentary written" />
          <ChecklistItem
            ok={checks.topRisks}
            label={checks.topRisks ? `${addressedRisks.length} top risks with actions` : "No top risk selected"}
          />
          {submitError && <p className="text-[13px] text-error-text">{submitError}</p>}
          <button
            onClick={submit}
            disabled={!ready || submitting}
            className="cursor-pointer rounded-[8px] bg-gca-green py-[10px] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            Submit
          </button>
          {!DEPARTMENT_LEAD_EMAIL && (
            <p className="text-[11px] text-gca-muted">
              Set NEXT_PUBLIC_DEPARTMENT_LEAD_EMAIL to email the department lead on submit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <p className="text-[12px] font-medium text-gca-muted">{label}</p>
      <p className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">{value}</p>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className={ok ? "text-gca-green" : "text-error-text"}>{ok ? "✓" : "✕"}</span>
      <span className={ok ? "text-gca-dark" : "text-error-text"}>{label}</span>
    </div>
  );
}
