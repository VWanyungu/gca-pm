import { forwardRef } from "react";
import { Jost, Cabin } from "next/font/google";
import type { ProjectDetail, TeamMember } from "@/components/project-overview/types";
import { formatLongDate, formatShortDate } from "@/components/milestones/types";
import type { ScheduleTask } from "@/components/schedule/types";
import type { Risk } from "@/components/risks/types";
import {
  EFFECTS_SEVERITY_LABEL,
  formatWeekPeriod,
  weekNumber,
  addDays,
  type DprDetail,
  type SubmissionPhoto,
  type WeeklySubmission,
} from "./types";
import { DotIcon } from "lucide-react";

const jost = Jost({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jost" });
const cabin = Cabin({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-cabin",
});
const jostStyle = { fontFamily: "var(--font-jost)" };

interface WeeklyReportDocumentProps {
  project: ProjectDetail;
  weekPeriod: string;
  submission: WeeklySubmission;
  team: TeamMember[];
  weekDprs: DprDetail[];
  photos: SubmissionPhoto[];
  totalCandidatePhotos: number;
  /** Filed and late counts come from the DPR list, which is one fetch and the authority on
   *  what the site submitted. `weekDprs` is a per-DPR detail fetch and may be short of it. */
  submittedDprCount: number;
  lateDprCount: number;
  /** At least one DPR detail could not be loaded, so the content sections are incomplete. */
  dprDetailsFailed: boolean;
  previousWeekActualPct: number | null;
  /** The latest approved submission before this one — not necessarily week_start − 7. */
  previousSpi: number | null;
  previousWeekStart: string | null;
  /** The risk behind top_risk_text, for its description and owner. Null when the PM typed a
   *  free-text top risk instead of picking one from the register. */
  topRisk: Risk | null;
  /** `project_metrics_snapshot.forecast_finish` as at approval — the schedule's own forecast,
   *  not an extrapolation of the headline percentage. */
  forecastFinish: string | null;
  lookaheadTasks: ScheduleTask[];
  weekAmendmentsCount: number;
  /** DPRs the project was actually due this week — expected weekdays less holidays. Null while
   *  it loads, which prints the filed count alone rather than an "of 0" that reads as a miss. */
  expectedDprDays: number | null;
  /** The project's working week (`dpr_expected_weekdays`), not a fixed 6. */
  allowableWorkingDays: number | null;
}

const RAG_LABEL: Record<string, string> = { green: "Green", amber: "Amber", red: "Red" };
const RAG_TEXT_CLASS: Record<string, string> = {
  green: "text-gca-green",
  amber: "text-gca-warning",
  red: "text-error-text",
};
const RAG_BORDER_CLASS: Record<string, string> = {
  green: "border-gca-green",
  amber: "border-gca-warning",
  red: "border-error-border",
};

const MS_PER_DAY = 86_400_000;

interface ForecastResult {
  forecastDate: Date | null;
  overrunDays: number | null;
  contractDurationDays: number | null;
  calendarDaysExpired: number | null;
  forecastDurationDays: number | null;
}

/** The forecast is the schedule's own: `project_metrics_snapshot.forecast_finish`, the latest
 *  expected finish across the applied schedule's tasks (AC-SCH-30 to 34), which respects task
 *  dependencies. This only derives the calendar arithmetic around it — how long the contract
 *  allows, how much of it has gone, and how far the forecast lands past the contract date. */
function computeForecast(
  submission: WeeklySubmission,
  project: ProjectDetail,
  forecastFinish: string | null,
): ForecastResult {
  const empty: ForecastResult = {
    forecastDate: null,
    overrunDays: null,
    contractDurationDays: null,
    calendarDaysExpired: null,
    forecastDurationDays: null,
  };
  if (!project.expected_start_date) return empty;

  const start = new Date(`${project.expected_start_date.slice(0, 10)}T00:00:00Z`);
  const asOf = new Date(`${addDays(submission.week_start, 6)}T00:00:00Z`);
  const calendarDaysExpired = Math.round((asOf.getTime() - start.getTime()) / MS_PER_DAY);
  const forecastDate = forecastFinish ? new Date(`${forecastFinish.slice(0, 10)}T00:00:00Z`) : null;

  let overrunDays: number | null = null;
  let contractDurationDays: number | null = null;
  if (project.expected_end_date) {
    const end = new Date(`${project.expected_end_date.slice(0, 10)}T00:00:00Z`);
    contractDurationDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
    if (forecastDate) {
      overrunDays = Math.round((forecastDate.getTime() - end.getTime()) / MS_PER_DAY);
    }
  }

  return {
    forecastDate,
    overrunDays,
    contractDurationDays,
    calendarDaysExpired,
    forecastDurationDays: forecastDate
      ? Math.round((forecastDate.getTime() - start.getTime()) / MS_PER_DAY)
      : null,
  };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDays(n: number | null): string {
  return n != null ? `${n} days` : "—";
}

function fmtPct1(n: number | null): string {
  return n != null ? `${n.toFixed(1)}%` : "—";
}

export const WeeklyReportDocument = forwardRef<HTMLDivElement, WeeklyReportDocumentProps>(
  function WeeklyReportDocument(
    {
      project,
      weekPeriod,
      submission,
      team,
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
    },
    ref,
  ) {
    const ragClass = submission.rag ? RAG_TEXT_CLASS[submission.rag] : "text-gca-show";
    const ragBorderClass = submission.rag ? RAG_BORDER_CLASS[submission.rag] : "border-gca-border";

    const actualPct = submission.actual_pct != null ? Number(submission.actual_pct) : null;
    const plannedPct = submission.planned_pct != null ? Number(submission.planned_pct) : null;
    const hasFigures = actualPct != null && plannedPct != null;
    const prevActualPct = previousWeekActualPct != null ? Number(previousWeekActualPct) : null;
    const gainPoints =
      actualPct != null && prevActualPct != null
        ? Math.round((actualPct - prevActualPct) * 10) / 10
        : null;

    const spi = submission.spi != null ? Number(submission.spi) : null;
    const prevSpi = previousSpi != null ? Number(previousSpi) : null;
    const spiDelta =
      spi != null && prevSpi != null ? Math.round((spi - prevSpi) * 100) / 100 : null;

    const forecast = computeForecast(submission, project, forecastFinish);

    const totalWeeks =
      project.expected_start_date && project.expected_end_date
        ? Math.ceil(
            (new Date(project.expected_end_date).getTime() -
              new Date(project.expected_start_date).getTime()) /
              (7 * MS_PER_DAY),
          )
        : null;

    const timeExpiredContractPct =
      forecast.calendarDaysExpired != null && forecast.contractDurationDays
        ? (forecast.calendarDaysExpired / forecast.contractDurationDays) * 100
        : null;
    const timeExpiredForecastPct =
      forecast.calendarDaysExpired != null && forecast.forecastDurationDays
        ? (forecast.calendarDaysExpired / forecast.forecastDurationDays) * 100
        : null;

    const positionSentences: string[] = [];
    if (hasFigures) {
      let s = `${actualPct}% of the work is built against a plan of ${plannedPct}%`;
      if (forecast.forecastDate) {
        s += `, and completion now forecasts to ${formatLongDate(toIsoDate(forecast.forecastDate))}`;
        if (forecast.overrunDays != null && forecast.overrunDays > 0) {
          s += ` — ${forecast.overrunDays} days beyond contract`;
        }
      }
      s += ".";
      if (gainPoints != null) {
        s += ` Progress this week was ${gainPoints} point${Math.abs(gainPoints) === 1 ? "" : "s"}.`;
      }
      positionSentences.push(s);
    }
    if (submission.escalate && submission.escalation_reason) {
      const reason = submission.escalation_reason.trim();
      positionSentences.push(/[.!?]$/.test(reason) ? reason : `${reason}.`);
    }

    const mainContractor = weekDprs
      .flatMap((d) => d.personnel_groups)
      .find((g) => g.party_type === "contractor")?.contractor_name;

    const riskOwnerTeamEntry = topRisk
      ? team.find((t) => t.user_id === topRisk.owner_id)
      : undefined;
    const riskOwnerName =
      topRisk?.owner_name ??
      (riskOwnerTeamEntry
        ? `${riskOwnerTeamEntry.first_name} ${riskOwnerTeamEntry.last_name}`
        : null);
    const riskOwnerLabel = riskOwnerName
      ? riskOwnerTeamEntry
        ? `${riskOwnerName}, ${riskOwnerTeamEntry.role}`
        : riskOwnerName
      : null;

    const creatorTeamEntry = team.find((t) => t.user_id === submission.created_by);
    const authorLabel = creatorTeamEntry
      ? `${submission.creator_name ?? `${creatorTeamEntry.first_name} ${creatorTeamEntry.last_name}`} (${creatorTeamEntry.role})`
      : (submission.creator_name ?? "—");

    const workItems = weekDprs
      .flatMap((d) => d.work_items.map((wi) => ({ ...wi, report_date: d.report_date })))
      .sort(
        (a, b) =>
          (a.report_date ?? "").localeCompare(b.report_date ?? "") || a.sort_order - b.sort_order,
      );

    // weekDprs is sorted by report_date, so the first entry a task gets this week carries its
    // position at the previous report: that day's running total less that day's own gain.
    const progressRows = new Map<string, { label: string; atLast: number; toDate: number }>();
    for (const dpr of weekDprs) {
      for (const ap of dpr.activity_progress) {
        const key = ap.task_id ?? `free:${ap.free_text}`;
        const label = ap.task_name ?? ap.free_text ?? "Untitled task";
        // shortcut: pg returns numeric columns as strings — coerce before arithmetic.
        const total = Number(ap.total_pct);
        const today = Number(ap.today_pct);
        const existing = progressRows.get(key);
        if (!existing) {
          progressRows.set(key, { label, atLast: total - today, toDate: total });
          continue;
        }
        existing.toDate = Math.max(existing.toDate, total);
      }
    }

    const personnelRows = new Map<string, { manDays: number; roles: Map<string, number> }>();
    for (const dpr of weekDprs) {
      for (const group of dpr.personnel_groups) {
        const existing = personnelRows.get(group.contractor_name) ?? {
          manDays: 0,
          roles: new Map<string, number>(),
        };
        existing.manDays += group.total_headcount;
        for (const rc of group.role_counts) {
          existing.roles.set(rc.role_name, (existing.roles.get(rc.role_name) ?? 0) + rc.headcount);
        }
        personnelRows.set(group.contractor_name, existing);
      }
    }

    const notedCategories: { label: string; entries: { date: string; text: string }[] }[] = (
      [
        ["Equipment on site", "equipment_text"],
        ["Visitors", "visitors_text"],
        ["Delays", "delays_text"],
        ["Incidents", "incidents_text"],
        ["Materials rejected", "materials_rejected_text"],
      ] as const
    )
      .map(([label, field]) => ({
        label,
        entries: weekDprs
          .filter((d) => d[field] && d[field]!.trim().length > 0)
          .map((d) => ({ date: formatShortDate(d.report_date), text: d[field]! })),
      }))
      .filter((row) => row.entries.length > 0);

    return (
      <div
        ref={ref}
        id="report-print-root"
        className={`report-paper ${jost.variable} ${cabin.variable} mx-auto w-full max-w-[800px] bg-white text-gca-dark`}
        style={{ fontFamily: "var(--font-cabin)" }}
      >
        {/* ===== Page 1 ===== */}
        <section className="flex flex-col gap-[14px] px-[36px] pt-[20px] pb-[14px]">
          <header className="flex items-end justify-between p-[20px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/GCA Logo.svg" alt="Gas Connect Africa" className="h-[28px] w-auto" />
            <div className="text-right text-[10.3px] leading-[1.6] text-gca-muted">
              <p className="font-extralight">
                {project.project_code}-WPR-{weekNumber(submission.week_start)}
              </p>
              {/* <div>Version control {submission.revision_no}</div> */}
            </div>
          </header>

          <div className="border-y-[1.2px] border-none border-gca-green py-[11px] text-center flex flex-col items-center">
            <h1 className="mb-[5px] text-[19px] font-bold text-gca-badge-text">
              Weekly Progress Report
            </h1>
            <p className="mb-[4px] text-[12.5px] font-bold text-gca-green-hover">{project.name}</p>
            <p className="text-[10.5px] text-gca-show flex gap-[3px] items-center">
              {/* Week {weekNumber(submission.week_start)} */}
              {/* {totalWeeks ? ` of ${totalWeeks}` : ""}  */}
              {/* <DotIcon size={24} /> */}
              {/* Week ending {formatLongDate(addDays(submission.week_start, 6))} */}
              {weekPeriod}
            </p>
          </div>
          {/* {submission.rag && (
            <div className={`border-b-[1.2px] pb-[5px] text-center ${ragBorderClass}`}>
              <p className="text-[11.5px] font-bold" >
                Status — <span className={ragClass}>{RAG_LABEL[submission.rag]}</span>
              </p>
            </div>
          )} */}

          {/* {positionSentences.length > 0 && (
            <div className="py-[2px] pl-[13px]">
              <p className="mb-[4px] text-[14px] text-gca-badge-text tracking-[0.06em] font-semibold">
                Status
              </p>
              <p className="text-[12.8px] leading-[1.45] text-gca-dark">
                {positionSentences.join(" ")}
              </p>
            </div>
          )} */}

          {hasFigures && (
            <section className="grid grid-cols-3 border-x-[0.8px] border-gca-border">
              <div className="border-r-[0.8px] border-gca-border bg-gca-page-bg p-[20px]">
                <p className="mb-[6px] text-[10.3px] font-medium tracking-[0.01em]">
                  Work complete
                </p>
                <p className="text-[23px] font-medium text-gca-badge-text">
                  {actualPct}
                  <span className="text-[13px] font-medium text-gca-show">%</span>
                </p>
                <div className="relative my-[7px] h-[5px] overflow-hidden border-[0.8px] border-gca-border bg-white">
                  <div
                    className="absolute inset-y-0 left-0 bg-gca-badge-bg"
                    style={{ width: `${plannedPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 bg-gca-green"
                    style={{ width: `${actualPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9.3px] text-gca-muted">
                  <span>Actual {actualPct}%</span>
                  <span>Planned {plannedPct}%</span>
                </div>
              </div>

              <div className="border-r-[0.8px] border-gca-border bg-gca-page-bg p-[20px] flex flex-col justify-between">
                <div className="">
                  <p className="mb-[6px] text-[10.3px] font-medium tracking-[0.01em]">
                    Schedule performance index
                  </p>
                  <p
                    className={`text-[23px] font-medium ${
                      submission.spi != null && Number(submission.spi) < 0.8
                        ? "text-error-text"
                        : "text-gca-badge-text"
                    }`}
                  >
                    {spi != null ? spi.toFixed(2) : "—"}
                  </p>
                </div>
                <p className="text-[9.6px] leading-[1.4] text-gca-show">
                  {spiDelta == null || previousWeekStart == null
                    ? "No earlier approved week to compare."
                    : spiDelta === 0
                      ? `Unchanged from week ${weekNumber(previousWeekStart)}.`
                      : `${Math.abs(spiDelta).toFixed(2)} ${
                          spiDelta > 0 ? "increase" : "decrease"
                        } from week ${weekNumber(previousWeekStart)}.`}
                </p>
              </div>
              <div className="bg-gca-page-bg p-[20px] flex flex-col justify-between">
                <div>
                  <p className="mb-[6px] text-[10.3px] font-medium tracking-[0.01em]">
                    Forecast completion
                  </p>
                  <p className="text-[23px] font-medium text-gca-badge-text">
                    {forecast.forecastDate ? formatLongDate(toIsoDate(forecast.forecastDate)) : "—"}
                  </p>
                </div>
                {forecast.forecastDate && forecast.overrunDays != null && (
                  <div className="flex justify-between w-full items-center">
                    <p
                      className={`text-[9.6px] leading-[1.4] ${forecast.overrunDays > 0 ? "text-error-text" : "text-gca-dark"}`}
                    >
                      {forecast.overrunDays > 0
                        ? `${forecast.overrunDays} days overdue.`
                        : forecast.overrunDays < 0
                          ? `${-forecast.overrunDays} days early.`
                          : "on track."}
                    </p>
                    <p className="text-[9.6px] leading-[1.4] text-gca-show">
                      Expected {formatLongDate(project.expected_end_date)}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {submission.top_risk_text && (
            <section>
              <SectionHeading>Principal risk</SectionHeading>
              <table className="w-full border-collapse text-[10.3px]">
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold"
                    >
                      <span className="font-bold">{submission.top_risk_text}</span>
                    </th>
                  </tr>
                </thead>
                {(topRisk?.description || submission.top_action || riskOwnerLabel) && (
                  <tbody>
                    {topRisk?.description && (
                      <tr>
                        <td
                          colSpan={2}
                          className="border-[0.7px] border-gca-green p-[8px] text-left"
                        >
                          {topRisk.description}
                        </td>
                      </tr>
                    )}
                    {submission.top_action && (
                      <tr>
                        <td className="border-[0.7px] border-gca-green bg-gca-stepper-from p-[8px] align-top">
                          <span className="font-bold">Action</span>
                        </td>
                        <td className="border-[0.7px] border-gca-green bg-gca-stepper-from p-[8px] align-top">
                          {submission.top_action}
                        </td>
                      </tr>
                    )}
                    {riskOwnerLabel && (
                      <tr>
                        <td className="border-[0.7px] border-gca-green bg-gca-stepper-from p-[8px] align-top">
                          <span className="font-bold">Action Owner</span>
                        </td>
                        <td className="border-[0.7px] border-gca-green p-[8px] align-top">
                          {riskOwnerLabel}
                        </td>
                      </tr>
                    )}
                  </tbody>
                )}
              </table>
            </section>
          )}

          {submission.pm_commentary && (
            <section>
              <SectionHeading>Project manager&apos;s commentary</SectionHeading>
              <p className="max-w-[62em] text-[10.3px] leading-[1.58]">
                {submission.pm_commentary}
              </p>
            </section>
          )}

          <section>
            <SectionHeading>Reporting compliance</SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <thead>
                <tr>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold">
                    Requirement
                  </th>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold">
                    Count
                  </th>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <Tr alt>
                  <Td>Daily progress reports filed</Td>
                  <Td center num>
                    {expectedDprDays != null
                      ? `${submittedDprCount} of ${expectedDprDays}`
                      : submittedDprCount}
                  </Td>
                  <Td center>
                    {expectedDprDays == null
                      ? submittedDprCount > 0
                        ? "Filed"
                        : "None"
                      : expectedDprDays === 0
                        ? "None due"
                        : submittedDprCount >= expectedDprDays
                          ? "Complete"
                          : `${expectedDprDays - submittedDprCount} missing`}
                  </Td>
                </Tr>
                <Tr>
                  <Td>Filed after the deadline</Td>
                  <Td center num>
                    {lateDprCount}
                  </Td>
                  <Td center>
                    {/* <Tag kind={lateDprCount > 0 ? "warn" : "ok"}> */}
                    {lateDprCount > 0 ? "Late" : "On time"}
                    {/* </Tag> */}
                  </Td>
                </Tr>
                <Tr alt>
                  <Td>This weekly submission</Td>
                  <Td center num>
                    {submission.approved_at ? formatShortDate(submission.approved_at) : "Draft"}
                  </Td>
                  <Td center>
                    {/* <Tag kind={submission.status === "approved" ? "ok" : undefined}> */}
                    {submission.status === "approved" ? "Approved" : "Draft"}
                    {/* </Tag> */}
                  </Td>
                </Tr>
                <Tr>
                  <Td>Amendments after submission</Td>
                  <Td center num>
                    {weekAmendmentsCount}
                  </Td>
                  <Td center>
                    {/* <Tag kind={weekAmendmentsCount > 0 ? "warn" : "ok"}> */}
                    {weekAmendmentsCount > 0 ? "Pending" : "None"}
                    {/* </Tag> */}
                  </Td>
                </Tr>
              </tbody>
            </table>
            {dprDetailsFailed && (
              <p className="mt-[6px] text-[9.6px] leading-[1.4] text-error-text">
                Some daily reports could not be loaded. The counts above are complete, but the site
                record, progress and personnel sections of this report are not.
              </p>
            )}
          </section>

          <section>
            <SectionHeading aside={formatWeekPeriod(addDays(submission.week_start, 7))}>
              One week look-ahead
            </SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <thead>
                <tr>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold ">
                    Schedule task
                  </th>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold ">
                    Due
                  </th>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold ">
                    Now
                  </th>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold ">
                    Plan
                  </th>
                  <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center font-bold ">
                    Flag
                  </th>
                </tr>
              </thead>
              <tbody>
                {lookaheadTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border-[0.7px] border-gca-green p-[8px] text-center text-gca-muted"
                    >
                      No tasks fall due next week.
                    </td>
                  </tr>
                ) : (
                  lookaheadTasks.map((t, i) => (
                    <Tr key={t.task_id} alt={i % 2 === 1}>
                      <Td>{t.task_name}</Td>
                      <Td center num>
                        {formatShortDate(t.expected_finish)}
                      </Td>
                      <Td center num>
                        {Math.round(Number(t.pct_work_complete))}%
                      </Td>
                      <Td center num dim>
                        {/* planned_pct is computed server-side from the baseline window;
                            planned_pct_complete is the stale value from the MPP upload. */}
                        {t.planned_pct != null ? `${Math.round(Number(t.planned_pct))}%` : "—"}
                      </Td>
                      <Td center>{t.is_overdue ? "Overdue" : t.is_critical ? "Critical" : null}</Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </section>

        {/* ===== Page 2 ===== */}
        <section className="flex flex-col gap-[14px] px-[36px] pb-[14px]">
          <section>
            <SectionHeading first>Project record</SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <tbody>
                <RecordRow
                  label="Project ID"
                  value={project.project_code}
                  label2="Title"
                  value2={project.name}
                />
                <RecordRow
                  label="Client"
                  value={project.client_name ?? "—"}
                  label2="Location"
                  value2={project.site_location ?? "—"}
                  alt
                />
                {/*{mainContractor && (
                  <RecordRow label="Main contractor" value={mainContractor} label2="" value2="" />
                )}*/}
                <RecordRow
                  label="Start date"
                  value={formatLongDate(project.expected_start_date)}
                  label2="Expected completion"
                  value2={formatLongDate(project.expected_end_date)}
                  alt={!mainContractor}
                />
                {/* <RecordRow
                  label="Forecast completion"
                  value={
                    forecast.forecastDate ? formatLongDate(toIsoDate(forecast.forecastDate)) : "—"
                  }
                  label2="Contract duration"
                  value2={fmtDays(forecast.contractDurationDays)}
                  alt={!!mainContractor}
                /> */}
                <RecordRow
                  label="Calendar days expired"
                  value={fmtDays(forecast.calendarDaysExpired)}
                  label2="Percentage time expired"
                  value2={fmtPct1(timeExpiredContractPct)}
                  alt={!mainContractor}
                />
                {/* <RecordRow
                  label="Time expired, forecast"
                  value={fmtPct1(timeExpiredForecastPct)}
                  label2="Allowable working days"
                  value2={allowableWorkingDays != null ? String(allowableWorkingDays) : "—"}
                  alt={!!mainContractor}
                />  */}

                <RecordRow
                  label="Allowable working days"
                  value={allowableWorkingDays != null ? String(allowableWorkingDays) : "—"}
                  label2="Days worked this week"
                  value2={
                    expectedDprDays != null
                      ? `${submittedDprCount} of ${expectedDprDays} expected`
                      : String(submittedDprCount)
                  }
                  alt={!!mainContractor}
                />
                {/* <RecordRow
                  label="Days worked this week"
                  value={
                    expectedDprDays != null
                      ? `${submittedDprCount} of ${expectedDprDays} expected`
                      : String(submittedDprCount)
                  }
                  label2=""
                  value2=""
                  alt={!mainContractor}
                /> */}
              </tbody>
            </table>
          </section>

          <section>
            <SectionHeading>About this report</SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <tbody>
                <RecordRow
                  label="Document title"
                  value="Weekly Progress Report"
                  label2="Week number"
                  value2={
                    totalWeeks
                      ? `${weekNumber(submission.week_start)} of ${totalWeeks}`
                      : String(weekNumber(submission.week_start))
                  }
                />
                <RecordRow
                  label="Reporting period"
                  value={formatWeekPeriod(submission.week_start)}
                  label2="Division process code"
                  value2={`WPR-${weekNumber(submission.week_start)}`}
                  alt
                />
                <RecordRow
                  label="Author"
                  value={authorLabel}
                  label2="Version control"
                  value2={String(submission.revision_no)}
                />
                <RecordRow
                  label="Source"
                  value={`${submittedDprCount} daily reports`}
                  label2="Issue status"
                  value2={
                    submission.status === "approved" ? "Approved" : "Draft, not issued to client"
                  }
                  alt
                />
              </tbody>
            </table>
          </section>
        </section>

        {/* ===== Page 3 ===== */}
        {weekDprs.length > 0 && (
          <section className="flex flex-col gap-[14px] px-[36px] pb-[14px]">
            {/* <section>
              <SectionHeading first>Conditions and effects on work</SectionHeading>
              <table className="w-full border-collapse text-[10.3px]">
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Weather</Th>
                    <Th center>Temperature</Th>
                    <Th center>Humidity</Th>
                    <Th center>Effect</Th>
                    <Th>Note</Th>
                  </tr>
                </thead>
                <tbody>
                  {weekDprs.map((d, i) => (
                    <Tr key={d.dpr_id} alt={i % 2 === 1}>
                      <Td num>{formatShortDate(d.report_date)}</Td>
                      <Td>{d.weather_category_name ?? "—"}</Td>
                      <Td center num>
                        {d.temp_min_c != null && d.temp_max_c != null
                          ? `${d.temp_min_c} – ${d.temp_max_c}°C`
                          : "—"}
                      </Td>
                      <Td center num>
                        {d.humidity_pct != null ? `${d.humidity_pct}%` : "—"}
                      </Td>
                      <Td center>
                        <Tag kind={d.effects_severity === "none" ? "ok" : "warn"}>
                          {EFFECTS_SEVERITY_LABEL[d.effects_severity]}
                        </Tag>
                      </Td>
                      <Td dim>{d.effects_text || "—"}</Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </section> */}

            {workItems.length > 0 && (
              <section>
                <SectionHeading>Work carried out</SectionHeading>
                <table className="w-full border-collapse text-[10.3px]">
                  <thead>
                    <tr>
                      <Th>Work area</Th>
                      <Th>Work carried out</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {workItems.map((wi, i) => (
                      <Tr key={wi.work_item_id} alt={i % 2 === 1}>
                        <Td>{wi.work_area}</Td>
                        <Td>{wi.work_carried_out}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {progressRows.size > 0 && (
              <section>
                <SectionHeading aside={formatWeekPeriod(submission.week_start)}>
                  Progress against schedule tasks
                </SectionHeading>
                <table className="w-full border-collapse text-[10.3px]">
                  <thead>
                    <tr>
                      <Th>Schedule task</Th>
                      <Th center>At last report</Th>
                      <Th center>To date</Th>
                      <Th center>Gain</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(progressRows.values()).map((row, i) => {
                      const gain = Math.round((row.toDate - row.atLast) * 10) / 10;
                      return (
                        <Tr key={row.label} alt={i % 2 === 1}>
                          <Td>{row.label}</Td>
                          <Td center num dim>
                            {row.atLast}%
                          </Td>
                          <Td center num>
                            {row.toDate}%
                          </Td>
                          <Td center num>
                            {gain >= 0 ? "+" : ""}
                            {gain}
                          </Td>
                        </Tr>
                      );
                    })}
                    <Tr>
                      <Td className="bg-gca-stepper-from font-semibold" label>
                        Weighted project completion
                        <span className="block font-normal text-gca-muted">
                          {previousWeekStart
                            ? `since week ${weekNumber(previousWeekStart)}`
                            : "no earlier approved week"}
                        </span>
                      </Td>
                      <Td center num dim className="bg-gca-stepper-from font-semibold">
                        {prevActualPct != null ? `${prevActualPct.toFixed(1)}%` : "—"}
                      </Td>
                      <Td center num className="bg-gca-stepper-from font-semibold">
                        {actualPct != null ? `${actualPct.toFixed(1)}%` : "—"}
                      </Td>
                      <Td center num className="bg-gca-stepper-from font-semibold">
                        {gainPoints != null ? `${gainPoints >= 0 ? "+" : ""}${gainPoints}` : "—"}
                      </Td>
                    </Tr>
                  </tbody>
                </table>
              </section>
            )}
          </section>
        )}

        {/* ===== Page 4 ===== */}
        {(personnelRows.size > 0 || notedCategories.length > 0 || photos.length > 0) && (
          <section className="flex flex-col gap-[14px] px-[36px] pb-[14px]">
            {personnelRows.size > 0 && (
              <section>
                <SectionHeading first>Personnel on site</SectionHeading>
                <table className="w-full border-collapse text-[10.3px]">
                  <thead>
                    <tr>
                      <Th>Contractor</Th>
                      <Th center>Man-days</Th>
                      <Th>Roles recorded</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(personnelRows.entries()).map(([contractor, row], i) => (
                      <Tr key={contractor} alt={i % 2 === 1}>
                        <Td>{contractor}</Td>
                        <Td center num>
                          {row.manDays}
                        </Td>
                        <Td dim>
                          {Array.from(row.roles.entries())
                            .sort((a, b) => b[1] - a[1])
                            .map(([role, count]) => `${role} ${count}`)
                            .join(" · ")}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/*{notedCategories.length > 0 && (
              <section>
                <SectionHeading first={personnelRows.size === 0}>Noted on the day</SectionHeading>
                <table className="w-full border-collapse text-[10.3px]">
                  <tbody>
                    {notedCategories.map((row, i) => (
                      <Tr key={row.label} alt={i % 2 === 1}>
                        <Td label>{row.label}</Td>
                        <Td>
                          {row.entries.map((e) => (
                            <span key={e.date} className="block">
                              <span className="font-medium">{e.date}:</span> {e.text}
                            </span>
                          ))}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}*/}

            {photos.length > 0 && (
              <section>
                <SectionHeading
                  first={personnelRows.size === 0 && notedCategories.length === 0}
                  
                  aside={`${photos.length} total`}
                >
                  Site photographs
                </SectionHeading>
                <div className="grid grid-cols-4 gap-[7px]">
                  {photos.map((photo) => (
                    <figure key={photo.photo_id} className="m-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={photo.caption ?? photo.site_location}
                        crossOrigin="anonymous"
                        className="h-[90px] w-full border-[0.8px] border-gca-green object-cover"
                      />
                      <figcaption className="mt-[3px] truncate text-[9.2px] leading-[1.3] text-gca-show">
                        {photo.caption ?? photo.site_location}{" "}
                        <span className="text-gca-muted">
                          · {formatShortDate(photo.report_date)}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-[24px] flex flex-col items-start w-full gap-[7px]">
              <p className="text-[11px] font-bold italic text-gca-dark">Prepared By</p>
              <div className="h-[17mm] w-[220px] border-t border-b border-gca-green" />
              <p className="mt-[2px] text-[11px] font-bold">{submission.creator_name ?? "—"}</p>
            </section>
          </section>
        )}
      </div>
    );
  },
);

export function SectionHeading({
  children,
  first,
  aside,
}: {
  children: React.ReactNode;
  first?: boolean;
  aside?: React.ReactNode;
}) {
  return (
    <h2
      className={`${first ? "mt-0" : "mt-[14px]"} mb-[7px] text-[14px] font-semibold text-gca-green`}
      style={{ fontFamily: "var(--font-cabin)" }}
    >
      {children}
      {aside && <span className="float-right text-[10px] font-normal text-gca-muted">{aside}</span>}
    </h2>
  );
}

export function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th
      className={`border-[0.7px] border-gca-green bg-gca-badge-bg p-[4.5px_8px] text-[9.8px] font-bold tracking-[0.01em] text-gca-dark ${
        center ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Tr({ children, alt }: { children: React.ReactNode; alt?: boolean }) {
  return <tr className={alt ? "bg-gca-page-bg" : undefined}>{children}</tr>;
}

export function Td({
  children,
  center,
  num,
  dim,
  label,
  className,
}: {
  children: React.ReactNode;
  center?: boolean;
  num?: boolean;
  dim?: boolean;
  label?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`border-[0.7px] border-gca-green p-[4.5px_8px] align-top ${center ? "text-center" : ""} ${
        num ? "tabular-nums whitespace-nowrap" : ""
      } ${dim ? "text-gca-muted" : ""} ${
        label ? "w-[42mm] bg-gca-stepper-from font-bold" : ""
      } ${className ?? ""}`}
      style={label ? jostStyle : undefined}
    >
      {children}
    </td>
  );
}

function Tag({ children, kind }: { children: React.ReactNode; kind?: "ok" | "warn" | "bad" }) {
  const classes =
    kind === "ok"
      ? "border-gca-green bg-gca-stepper-from text-gca-badge-text"
      : kind === "warn"
        ? "border-gca-warning text-gca-warning"
        : kind === "bad"
          ? "border-error-border text-error-text"
          : "border-gca-green text-gca-badge-text";
  return (
    <span
      className={`inline-block border-[0.8px] px-[7px] py-[1px] text-[9px] font-bold whitespace-nowrap ${classes}`}
    >
      {children}
    </span>
  );
}

export function RecordRow({
  label,
  value,
  label2,
  value2,
  alt,
}: {
  label: string;
  value: string;
  label2: string;
  value2: string;
  alt?: boolean;
}) {
  return (
    <Tr alt={alt}>
      <Td label>{label}</Td>
      <Td>{value}</Td>
      {label2 && (
        <>
          <Td label>{label2}</Td>
          <Td>{value2}</Td>
        </>
      )}
    </Tr>
  );
}
