"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Percent, Shield, Trophy, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { reportError } from "@/lib/toast";
import type { TeamMember, MetricRow, Milestone } from "@/components/project-overview/types";
import type { ScheduleVersion } from "@/components/schedule/types";
import { AddressedRiskRow } from "./addressed-risk-row";
import { AddFromRegisterForm } from "./add-from-register-form";
import { DprPhotosSection } from "./dpr-photos-section";
import { WeekDprStrip } from "./week-dpr-strip";
import { NextMilestonesList } from "./next-milestones-list";
import {
  updateWeeklySubmission,
  approveWeeklySubmission,
  removeAddressedRisk,
  useWeeklySubmissionInvalidate,
} from "./use-weekly-submission-data";
import { buildMailto, buildSubmissionReportText, DEPARTMENT_LEAD_EMAIL } from "./mailto";
import type { WeeklySubmission } from "./types";
import { formatWeekPeriod, weekNumber } from "./types";
import classNames from "classnames/bind";

function useLatestScheduleVersion(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "versions", "latest"],
    queryFn: async () => {
      const res = await api.get<{ versions: ScheduleVersion[] }>(
        `/projects/${projectId}/schedule/versions`,
      );
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
  viewSubmissionHref,
  onPrevWeek,
  onNextWeek,
  setTab,
  tab,
  weekStart,
}: {
  projectId: string;
  tab: "week" | "register";
  projectName: string;
  submission: WeeklySubmission;
  metrics: MetricRow[];
  milestones: Milestone[];
  team: TeamMember[];
  viewSubmissionHref?: string;
  weekStart: string;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  setTab: (tab: "week" | "register") => void;
}) {
  const invalidate = useWeeklySubmissionInvalidate(projectId);
  const { data: latestVersion } = useLatestScheduleVersion(projectId);
  const latestMetric = metrics[metrics.length - 1];

  const [commentary, setCommentary] = useState(submission.pm_commentary ?? "");
  const [addingRisk, setAddingRisk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function saveCommentary() {
    if (commentary === (submission.pm_commentary ?? "")) return;
    await updateWeeklySubmission(projectId, submission.submission_id, {
      pm_commentary: commentary,
    });
    invalidate();
  }

  // AC-WKS-03: picking a top risk pre-fills top_risk_text/top_action from that risk's
  // own title/mitigation — no free-text entry. Marking again clears it.
  async function setTopRisk(risk: { risk_id: string; title: string; mitigation: string | null }) {
    const isCurrent = submission.top_risk_id === risk.risk_id;
    await updateWeeklySubmission(projectId, submission.submission_id, {
      top_risk_id: isCurrent ? null : risk.risk_id,
      top_risk_text: isCurrent ? null : risk.title,
      top_action: isCurrent ? null : (risk.mitigation ?? ""),
    });
    invalidate();
  }

  async function markNoRisksThisWeek() {
    await updateWeeklySubmission(projectId, submission.submission_id, {
      top_risk_id: null,
      top_risk_text: "No significant risks this week.",
      top_action: "No action needed.",
    });
    invalidate();
  }

  async function clearTopRisk() {
    await updateWeeklySubmission(projectId, submission.submission_id, {
      top_risk_id: null,
      top_risk_text: null,
      top_action: null,
    });
    invalidate();
  }

  const addressedRisks = submission.addressed_risks ?? [];
  // Matches AC-WKS-04 (backend approval validation) exactly. Schedule progress is
  // informational only — AC-WKS-05 explicitly allows approval with no schedule.
  const checks = {
    progress: !!latestMetric,
    commentary: commentary.trim().length > 0,
    topRiskText: !!submission.top_risk_text?.trim(),
    topAction: !!submission.top_action?.trim(),
  };
  const ready = checks.commentary && checks.topRiskText && checks.topAction;

  async function submit() {
    setSubmitting(true);
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
      reportError(err instanceof Error ? err.message : "Couldn't submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-full gap-[32px]">
      <div className="flex w-full flex-col gap-[28px]">
        <div className="flex w-fit gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
          <button
            onClick={() => setTab("week")}
            className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
              tab === "week"
                ? "bg-white font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                : "font-normal text-gca-show"
            }`}
          >
            Week {weekNumber(weekStart)}
          </button>
          <button
            onClick={() => setTab("register")}
            className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
              tab === "register"
                ? "bg-white font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                : "font-normal text-gca-show"
            }`}
          >
            Register
          </button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">
              Week {weekNumber(submission.week_start)} submission
            </h1>
            <p className="mt-[2px] text-[13px] text-gca-show">
              {formatWeekPeriod(submission.week_start)}
            </p>
          </div>
          {submission.status === "draft" ? (
            <span className="rounded-[999px] px-[10px] py-[3px] text-[12px] font-medium text-gca-warning">
              Draft
            </span>
          ) : (
            <span className="rounded-[999px] px-[10px] py-[3px] text-[12px] font-medium text-gca-green">
              Submitted
            </span>
          )}
        </div>

        <WeekDprStrip
          projectId={projectId}
          weekStart={submission.week_start}
          team={team}
          onPrevWeek={onPrevWeek}
          onNextWeek={onNextWeek}
        />

        <div className="flex w-full gap-[32px]">
          <div id="left" className="flex w-2/3 flex-col gap-[32px]">
            {/* Progress */}
            {latestMetric && (
              <div className="flex w-full flex-col gap-[16px]">
                <div className="flex flex-col items-start">
                  <h3 className="text-[16px] font-semibold text-gca-dark">Progress</h3>
                  <p className="text-[13px] text-gca-show">From the schedule</p>
                </div>

                <div className="flex gap-[32px]">
                  {/* <Tile label="Planned" value={`${Math.trunc(latestMetric.planned_pct)}%`} />
                  <Tile label="Actual" value={`${Math.trunc(latestMetric.actual_pct)}%`} />
                  <Tile label="SPI" value={latestMetric.spi?.toFixed(2) ?? "—"} /> */}

                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[12px] font-medium text-gca-muted">Planned</p>

                    <p className="font-mono text-[22px] font-semibold tracking-[-0.33px] text-gca-dark flex items-center gap-[4px]">
                      {Math.trunc(latestMetric.planned_pct)} <Percent className="size-[18px]" />
                    </p>
                  </div>

                  <div className="flex flex-col gap-[2px] border-l border-gca-border pl-[25px]">
                    <p className="text-[12px] font-medium text-gca-muted">Actual</p>

                    <p className="font-mono text-[22px] font-semibold tracking-[-0.33px] text-gca-dark flex items-center gap-[4px]">
                      {Math.trunc(latestMetric.actual_pct)} <Percent className="size-[18px]" />
                    </p>
                  </div>

                  <div className="flex flex-col gap-[2px] border-l border-gca-border pl-[25px]">
                    <p className="text-[12px] font-medium text-gca-muted">SPI</p>

                    <p className="font-mono text-[22px] font-semibold tracking-[-0.33px] text-gca-dark">
                      {latestMetric.spi?.toFixed(2) ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Commentary */}
            <div className="flex w-full flex-col gap-[12px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-gca-dark">Commentary</h3>
                <span className="font-mono text-[12px] text-gca-muted">
                  {commentary.length} / 1,000
                </span>
              </div>
              <textarea
                value={commentary}
                onChange={(e) => setCommentary(e.target.value.slice(0, 1000))}
                onBlur={saveCommentary}
                className="h-[112px] resize-none rounded-[8px] border border-gca-border px-[12px] py-[10px] text-[14px] outline-none focus:border-gca-green"
              />
            </div>

            {/* Top Risks and Actions */}
            <div className="flex w-full flex-col gap-[4px]">
              <div className="flex items-center justify-between pb-[4px]">
                <h3 className="text-[16px] font-semibold text-gca-dark">Top risks and actions</h3>
                {!addingRisk && addressedRisks.length > 0 && (
                  <button
                    onClick={() => setAddingRisk(true)}
                    className="cursor-pointer text-[13px] font-medium text-gca-green"
                  >
                    Add from register
                  </button>
                )}
              </div>
              {/* <p className="pb-[8px] text-[13px] text-gca-show">
                Mark one addressed risk as this week&apos;s top risk — its title and mitigation
                become the top risk and action required to submit.{" "}
                {!submission.top_risk_text && (
                  <button
                    onClick={markNoRisksThisWeek}
                    className="cursor-pointer font-medium text-gca-green"
                  >
                    No risks this week
                  </button>
                )}
              </p> */}

              {addingRisk && (
                <div className="pb-[16px]">
                  <AddFromRegisterForm
                    projectId={projectId}
                    submissionId={submission.submission_id}
                    alreadyAddressed={addressedRisks}
                    team={team}
                    onDone={() => setAddingRisk(false)}
                    onCancel={() => setAddingRisk(false)}
                  />
                </div>
              )}

              {addressedRisks.length === 0
                ? !addingRisk &&
                  (!submission.top_risk_id && submission.top_risk_text ? (
                    <div className="flex items-center justify-between rounded-[8px] bg-gca-badge-bg px-[14px] py-[10px] text-[13px]">
                      <span className="font-medium text-gca-green">{submission.top_risk_text}</span>
                      <button onClick={clearTopRisk} className="cursor-pointer text-gca-muted">
                        Clear
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-[8px] rounded-[12px] bg-[#f7f9f7] py-[32px]">
                      <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-white">
                        <Shield className="size-[18px] text-gca-green" />
                      </span>
                      <div className="flex flex-col items-center gap-[4px] text-center">
                        <p className="text-[15px] font-semibold text-gca-dark">No top risks yet</p>
                        {/* <p className="text-[13px] text-gca-show">
                          Pick this week&apos;s top risks from the risk register
                        </p> */}
                      </div>
                      <div className="mt-[8px] flex items-center gap-[12px]">
                        <button
                          onClick={() => setAddingRisk(true)}
                          className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-gca-border bg-white py-[10px] pl-[14px] pr-[16px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
                        >
                          Add from register
                        </button>
                        {!submission.top_risk_text && (
                          <button
                            onClick={markNoRisksThisWeek}
                            className="cursor-pointer text-[13px] font-medium text-gca-green"
                          >
                            No risks this week
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                : addressedRisks.map((risk, i) => (
                    <AddressedRiskRow
                      key={risk.risk_id}
                      index={i + 1}
                      projectId={projectId}
                      addressedRisk={risk}
                      isMainTopRisk={risk.risk_id === submission.top_risk_id}
                      team={team}
                      onMarkAsTopRisk={(title, mitigation) =>
                        setTopRisk({ risk_id: risk.risk_id, title, mitigation })
                      }
                      onRemove={async () => {
                        await removeAddressedRisk(
                          projectId,
                          submission.submission_id,
                          risk.risk_id,
                        );
                        invalidate();
                      }}
                    />
                  ))}
            </div>

            <DprPhotosSection projectId={projectId} submissionId={submission.submission_id} />

            <NextMilestonesList milestones={milestones} />
          </div>

          <div className="w-1/3 shrink-0">
            <div className="sticky top-[88px] flex flex-col gap-[16px] rounded-[12px] bg-[#f7f9f7] p-[24px]">
              {viewSubmissionHref ? (
                <>
                  <h3 className="text-[16px] font-semibold text-gca-dark">Ready to submit?</h3>
                  <ChecklistItem ok label="Progress from this week's schedule" />
                  <ChecklistItem ok label="Commentary written" />
                  <ChecklistItem ok label={`${addressedRisks.length} top risks with actions`} />
                  <Link
                    href={viewSubmissionHref}
                    className="cursor-pointer rounded-[8px] border border-gca-green py-[10px] text-center text-[14px] font-semibold text-gca-green hover:bg-gca-green/10"
                  >
                    View submission
                  </Link>
                </>
              ) : (
                <>
                  <h3 className="text-[16px] font-semibold text-gca-dark">Ready to submit?</h3>
                  <ChecklistItem ok={checks.progress} label="Progress from this week's schedule" />
                  <ChecklistItem ok={checks.commentary} label="Commentary written" />
                  <ChecklistItem
                    ok={checks.topRiskText && checks.topAction}
                    label="Top risk marked"
                  />
                  <button
                    onClick={submit}
                    disabled={!ready || submitting}
                    className="cursor-pointer rounded-[8px] bg-gca-green py-[10px] text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    Submit
                  </button>
                  {!ready && (
                    <p className="text-[12px] text-error-text">
                      {!checks.commentary
                        ? "Write a commentary to submit."
                        : "Mark a top risk, or 'No risks this week', to submit."}
                    </p>
                  )}
                  {!DEPARTMENT_LEAD_EMAIL && (
                    <p className="text-[11px] text-gca-muted">
                      Set NEXT_PUBLIC_DEPARTMENT_LEAD_EMAIL to email the department lead on submit.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <p className="text-[12px] font-medium text-gca-muted">{label}</p>
      <p className="font-mono text-[22px] font-semibold tracking-[-0.33px] text-gca-dark">
        {value}
      </p>
    </div>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-[8px] text-[13px]">
      <span className={ok ? "text-gca-green" : "text-error-text"}>
        {ok ? (
          <Check className="size-[18px] text-gca-green" />
        ) : (
          <X className="size-[18px] text-red-500" />
        )}
      </span>
      <span className={ok ? "text-gca-dark" : "text-error-text"}>{label}</span>
    </div>
  );
}
