"use client";

import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useScheduleTasks } from "@/components/schedule/use-schedule-data";
import { useDprAmendments } from "@/components/dpr/use-dpr-actions";
import { useRisk } from "@/components/risks/use-risks-data";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import {
  useWeekDprs,
  useSubmissionPhotos,
  useWeeklySubmissions,
  useExpectedDprDays,
} from "./use-weekly-submission-data";
import { addDays, type WeeklySubmission, type DprDetail } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

/** Everything the weekly report document needs beyond the submission itself, composed from
 *  existing read endpoints — no new backend data routes. */
export function useWeeklyReportData(projectId: string, submission: WeeklySubmission | undefined) {
  const { data: weekDprSummaries = [] } = useWeekDprs(projectId, submission?.week_start ?? "");
  const submittedDprIds = weekDprSummaries
    .filter((d) => d.status === "submitted")
    .map((d) => d.dpr_id);

  const dprQueries = useQueries({
    queries: submittedDprIds.map((dprId) => ({
      queryKey: ["project", projectId, "dpr", dprId],
      queryFn: async () =>
        unwrap(await api.get<{ dpr: DprDetail }>(`/projects/${projectId}/dpr/${dprId}`)).dpr,
      enabled: !!submission,
      staleTime: 10_000,
    })),
  });

  const weekDprs = dprQueries
    .map((q) => q.data)
    .filter((d): d is DprDetail => d != null)
    .sort((a, b) => (a.report_date ?? "").localeCompare(b.report_date ?? ""));

  // Compliance is a statement about what the site filed, so it counts the DPR list — not the
  // details, which are a separate fetch per DPR. One failed detail must never read as a
  // missed report.
  const submittedDprs = weekDprSummaries.filter((d) => d.status === "submitted");
  const dprDetailsFailed = dprQueries.some((q) => q.isError);

  const { data: allCandidatePhotos = [] } = useSubmissionPhotos(
    projectId,
    submission?.submission_id,
  );
  const photos = allCandidatePhotos.filter((p) => p.selected);

  // The week to compare against is the latest approved submission before this one, not
  // week_start − 7: a week nobody filed would otherwise read as "no prior figures", and a
  // superseded row for that week would be picked up alongside the approved one.
  const { data: approvedList } = useWeeklySubmissions({
    projectId,
    status: "approved",
    limit: 100,
  });
  const previousSubmission =
    submission && approvedList
      ? (approvedList.submissions.find(
          (s) => s.week_start.slice(0, 10) < submission.week_start.slice(0, 10),
        ) ?? null)
      : null;
  const previousWeekActualPct = previousSubmission?.actual_pct ?? null;

  // AC-WKS-03: top_risk_text/top_action are copies of the risk's title and mitigation. The
  // description and owner only exist on the risk itself.
  const { data: topRisk = null } = useRisk(projectId, submission?.top_risk_id ?? "");

  // The schedule's own forecast finish, read from the metrics snapshot the project detail
  // already carries. Approval writes a snapshot in the same transaction as planned_pct /
  // actual_pct / spi (AC-WKS-05), so taking the latest one at or before the approval date
  // gives the forecast that belongs with the figures frozen on this submission.
  const { data: projectDetail } = useProjectDetail(projectId);
  const metrics = projectDetail?.metrics ?? []; // ascending by as_of_date
  const approvedOn = submission?.approved_at?.slice(0, 10);
  const metricsSnapshot = approvedOn
    ? [...metrics].reverse().find((m) => m.as_of_date.slice(0, 10) <= approvedOn)
    : metrics[metrics.length - 1]; // a draft reports today's position
  const forecastFinish = metricsSnapshot?.forecast_finish ?? null;

  // A look-ahead looks forward: the Monday–Sunday week after the one being reported, not the
  // reported week itself.
  const { data: allScheduleTasks = [] } = useScheduleTasks(projectId);
  const lookaheadStart = submission ? addDays(submission.week_start, 7) : "";
  const lookaheadEnd = submission ? addDays(submission.week_start, 13) : "";
  const lookaheadTasks = allScheduleTasks
    .filter(
      (t) =>
        !t.is_summary &&
        !!submission &&
        (t.expected_finish ?? "") >= lookaheadStart &&
        (t.expected_finish ?? "") <= lookaheadEnd,
    )
    .sort((a, b) => (a.expected_finish ?? "").localeCompare(b.expected_finish ?? ""));

  const { data: expectedDays } = useExpectedDprDays(projectId, submission?.week_start ?? "");

  const { data: pendingAmendments = [] } = useDprAmendments(projectId, true);
  const weekDprIdSet = new Set(weekDprs.map((d) => d.dpr_id));
  const weekAmendmentsCount = pendingAmendments.filter((a) => weekDprIdSet.has(a.dpr_id)).length;

  const isLoading = !submission || dprQueries.some((q) => q.isLoading);

  return {
    weekDprs,
    submittedDprCount: submittedDprs.length,
    lateDprCount: submittedDprs.filter((d) => d.is_late).length,
    dprDetailsFailed,
    photos,
    totalCandidatePhotos: allCandidatePhotos.length,
    previousWeekActualPct,
    previousSpi: previousSubmission?.spi ?? null,
    previousWeekStart: previousSubmission?.week_start ?? null,
    topRisk,
    forecastFinish,
    lookaheadTasks,
    weekAmendmentsCount,
    expectedDprDays: expectedDays?.expected_dates.length ?? null,
    allowableWorkingDays: expectedDays?.expected_weekdays.length ?? null,
    isLoading,
  };
}
