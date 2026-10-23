"use client";

import { useQueries } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useScheduleTasks } from "@/components/schedule/use-schedule-data";
import { useDprAmendments } from "@/components/dpr/use-dpr-actions";
import { useWeekDprs, useSubmissionPhotos, useWeekSubmission } from "./use-weekly-submission-data";
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

  const { data: allCandidatePhotos = [] } = useSubmissionPhotos(projectId, submission?.submission_id);
  const photos = allCandidatePhotos.filter((p) => p.selected);

  const { data: prevWeek } = useWeekSubmission(
    projectId,
    submission ? addDays(submission.week_start, -7) : "",
  );
  const previousWeekActualPct = prevWeek?.approved?.actual_pct ?? null;

  const { data: allScheduleTasks = [] } = useScheduleTasks(projectId);
  const weekEnd = submission ? addDays(submission.week_start, 6) : "";
  const lookaheadTasks = allScheduleTasks
    .filter(
      (t) =>
        !t.is_summary &&
        !!submission &&
        (t.expected_finish ?? "") >= submission.week_start &&
        (t.expected_finish ?? "") <= weekEnd,
    )
    .sort((a, b) => (a.expected_finish ?? "").localeCompare(b.expected_finish ?? ""));

  const { data: pendingAmendments = [] } = useDprAmendments(projectId, true);
  const weekDprIdSet = new Set(weekDprs.map((d) => d.dpr_id));
  const weekAmendmentsCount = pendingAmendments.filter((a) => weekDprIdSet.has(a.dpr_id)).length;

  const isLoading = !submission || dprQueries.some((q) => q.isLoading);

  return {
    weekDprs,
    photos,
    totalCandidatePhotos: allCandidatePhotos.length,
    previousWeekActualPct,
    lookaheadTasks,
    weekAmendmentsCount,
    isLoading,
  };
}
