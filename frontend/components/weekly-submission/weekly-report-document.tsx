import { forwardRef } from "react";
import { Jost, Cabin } from "next/font/google";
import type { ProjectDetail, TeamMember } from "@/components/project-overview/types";
import { formatLongDate, formatShortDate } from "@/components/milestones/types";
import type { ScheduleTask } from "@/components/schedule/types";
import {
  EFFECTS_SEVERITY_LABEL,
  formatWeekPeriod,
  weekNumber,
  addDays,
  type DprDetail,
  type SubmissionPhoto,
  type WeeklySubmission,
} from "./types";

const jost = Jost({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-jost" });
const cabin = Cabin({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-cabin" });
const jostStyle = { fontFamily: "var(--font-jost)" };

interface WeeklyReportDocumentProps {
  project: ProjectDetail;
  submission: WeeklySubmission;
  team: TeamMember[];
  weekDprs: DprDetail[];
  photos: SubmissionPhoto[];
  totalCandidatePhotos: number;
  previousWeekActualPct: number | null;
  lookaheadTasks: ScheduleTask[];
  weekAmendmentsCount: number;
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
  totalDaysAtCurrentRate: number | null;
}

/** Inverts the same linear-rate logic the schedule uses for a task's planned % (see
 *  PLANNED_I_EXPR in backend/v1/database/utils/database.ts) at the project level: at the
 *  current rate of progress, when does 100% land, and how far past the contract date is that. */
function computeForecast(submission: WeeklySubmission, project: ProjectDetail): ForecastResult {
  const empty: ForecastResult = {
    forecastDate: null,
    overrunDays: null,
    contractDurationDays: null,
    calendarDaysExpired: null,
    totalDaysAtCurrentRate: null,
  };
  const actualPct = submission.actual_pct != null ? Number(submission.actual_pct) : null;
  if (!project.expected_start_date || actualPct == null || actualPct <= 0) return empty;

  const start = new Date(`${project.expected_start_date.slice(0, 10)}T00:00:00Z`);
  const asOf = new Date(`${addDays(submission.week_start, 6)}T00:00:00Z`);
  const calendarDaysExpired = Math.round((asOf.getTime() - start.getTime()) / MS_PER_DAY);
  const totalDaysAtCurrentRate = calendarDaysExpired * (100 / actualPct);
  const forecastDate = new Date(start.getTime() + totalDaysAtCurrentRate * MS_PER_DAY);

  let overrunDays: number | null = null;
  let contractDurationDays: number | null = null;
  if (project.expected_end_date) {
    const end = new Date(`${project.expected_end_date.slice(0, 10)}T00:00:00Z`);
    overrunDays = Math.round((forecastDate.getTime() - end.getTime()) / MS_PER_DAY);
    contractDurationDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
  }

  return { forecastDate, overrunDays, contractDurationDays, calendarDaysExpired, totalDaysAtCurrentRate };
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
      submission,
      team,
      weekDprs,
      photos,
      totalCandidatePhotos,
      previousWeekActualPct,
      lookaheadTasks,
      weekAmendmentsCount,
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
      actualPct != null && prevActualPct != null ? Math.round((actualPct - prevActualPct) * 10) / 10 : null;

    const forecast = computeForecast(submission, project);

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
      forecast.calendarDaysExpired != null && forecast.totalDaysAtCurrentRate
        ? (forecast.calendarDaysExpired / forecast.totalDaysAtCurrentRate) * 100
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

    const lateCount = weekDprs.filter((d) => d.is_late).length;

    const mainContractor = weekDprs
      .flatMap((d) => d.personnel_groups)
      .find((g) => g.party_type === "contractor")?.contractor_name;

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

    const progressRows = new Map<string, { label: string; toDate: number; gain: number }>();
    for (const dpr of weekDprs) {
      for (const ap of dpr.activity_progress) {
        const key = ap.task_id ?? `free:${ap.free_text}`;
        const label = ap.task_name ?? ap.free_text ?? "Untitled task";
        const existing = progressRows.get(key) ?? { label, toDate: 0, gain: 0 };
        // shortcut: pg returns numeric columns as strings — coerce before arithmetic.
        existing.toDate = Math.max(existing.toDate, Number(ap.total_pct));
        existing.gain += Number(ap.today_pct);
        progressRows.set(key, existing);
      }
    }

    const personnelRows = new Map<
      string,
      { manDays: number; roles: Map<string, number> }
    >();
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

    const notedCategories: { label: string; value: string }[] = (
      [
        ["Equipment on site", "equipment_text"],
        ["Visitors", "visitors_text"],
        ["Delays", "delays_text"],
        ["Incidents", "incidents_text"],
      ] as const
    )
      .map(([label, field]) => {
        const value = weekDprs
          .filter((d) => d[field] && d[field]!.trim().length > 0)
          .map((d) => `${formatShortDate(d.report_date)}: ${d[field]}`)
          .join("; ");
        return { label, value };
      })
      .filter((row) => row.value.length > 0);

    return (
      <div
        ref={ref}
        className={`${jost.variable} ${cabin.variable} mx-auto w-full max-w-[800px] bg-white text-gca-dark`}
        style={{ fontFamily: "var(--font-cabin)" }}
      >
        {/* ===== Page 1 ===== */}
        <section className="flex flex-col gap-[14px] p-[36px]">
          <header className="flex items-start justify-between gap-[16px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/GCA Logo.svg" alt="Gas Connect Africa" className="h-[28px] w-auto" />
            <div className="text-right text-[9.5px] leading-[1.6] text-gca-muted" style={jostStyle}>
              <div>
                Document code {project.project_code}-WPR-{weekNumber(submission.week_start)}
              </div>
              <div>Version control {submission.revision_no}</div>
            </div>
          </header>

          <div className="border-y-[1.2px] border-gca-green py-[11px] text-center">
            <h1 className="mb-[5px] text-[19px] font-bold text-gca-badge-text" style={jostStyle}>
              Weekly Progress Report
            </h1>
            <p className="mb-[4px] text-[12.5px] font-bold text-gca-green-hover" style={jostStyle}>
              {project.name}
            </p>
            <p className="text-[10.5px] text-gca-show">
              Week {weekNumber(submission.week_start)}
              {totalWeeks ? ` of ${totalWeeks}` : ""} · week ending{" "}
              {formatLongDate(addDays(submission.week_start, 6))}
            </p>
          </div>
          {submission.rag && (
            <div className={`border-b-[1.2px] pb-[5px] text-center ${ragBorderClass}`}>
              <p className="text-[11.5px] font-bold" style={jostStyle}>
                Status — <span className={ragClass}>{RAG_LABEL[submission.rag]}</span>
              </p>
            </div>
          )}

          {positionSentences.length > 0 && (
            <div className="border-l-[2.5px] border-error-border py-[2px] pl-[13px]">
              <p
                className="mb-[4px] text-[9.6px] font-bold tracking-[0.06em] text-error-text uppercase"
                style={jostStyle}
              >
                The position
              </p>
              <p className="text-[12.8px] leading-[1.45] text-gca-dark">
                {positionSentences.join(" ")}
              </p>
            </div>
          )}

          {hasFigures && (
            <section className="grid grid-cols-3 border-[0.8px] border-gca-green">
              <div className="border-r-[0.8px] border-gca-green bg-gca-page-bg p-[11px]">
                <p className="mb-[6px] text-[9.5px] font-bold tracking-[0.01em]" style={jostStyle}>
                  Work complete
                </p>
                <p className="text-[23px] font-bold text-gca-badge-text" style={jostStyle}>
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
              <div className="border-r-[0.8px] border-gca-green bg-gca-page-bg p-[11px]">
                <p className="mb-[6px] text-[9.5px] font-bold tracking-[0.01em]" style={jostStyle}>
                  Schedule performance index
                </p>
                <p
                  className={`text-[23px] font-bold ${
                    submission.spi != null && Number(submission.spi) < 0.8
                      ? "text-error-text"
                      : "text-gca-badge-text"
                  }`}
                  style={jostStyle}
                >
                  {submission.spi != null ? Number(submission.spi).toFixed(2) : "—"}
                </p>
              </div>
              <div className="bg-gca-page-bg p-[11px]">
                <p className="mb-[6px] text-[9.5px] font-bold tracking-[0.01em]" style={jostStyle}>
                  Forecast completion
                </p>
                <p className="text-[18px] font-bold text-gca-badge-text" style={jostStyle}>
                  {forecast.forecastDate ? formatLongDate(toIsoDate(forecast.forecastDate)) : "—"}
                </p>
                {forecast.forecastDate && forecast.overrunDays != null && (
                  <p className="mt-[6px] text-[9.6px] leading-[1.4] text-gca-show">
                    <b
                      className={`font-semibold ${
                        forecast.overrunDays > 0 ? "text-error-text" : "text-gca-dark"
                      }`}
                    >
                      {forecast.overrunDays > 0
                        ? `${forecast.overrunDays} days beyond contract.`
                        : forecast.overrunDays < 0
                          ? `${-forecast.overrunDays} days ahead of contract.`
                          : "On contract."}
                    </b>
                  </p>
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
                    <th className="border-[0.7px] border-gca-green bg-gca-badge-bg p-[8px] text-center text-[11px]">
                      {submission.top_risk_text}
                    </th>
                  </tr>
                </thead>
                {submission.top_action && (
                  <tbody>
                    <tr>
                      <td className="border-[0.7px] border-gca-green bg-gca-stepper-from p-[8px] align-top">
                        <span className="mr-[6px] font-bold" style={jostStyle}>
                          Action:
                        </span>
                        {submission.top_action}
                      </td>
                    </tr>
                  </tbody>
                )}
              </table>
            </section>
          )}

          {submission.pm_commentary && (
            <section>
              <SectionHeading>Project manager&apos;s commentary</SectionHeading>
              <p className="max-w-[62em] text-[10.6px] leading-[1.58]">
                {submission.pm_commentary}
              </p>
            </section>
          )}

          <section>
            <SectionHeading>Reporting compliance</SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <thead>
                <tr>
                  <Th>Requirement</Th>
                  <Th center>Count</Th>
                  <Th center>Status</Th>
                </tr>
              </thead>
              <tbody>
                <Tr alt>
                  <Td>Daily progress reports filed</Td>
                  <Td center num>
                    {weekDprs.length}
                  </Td>
                  <Td center>
                    <Tag kind={weekDprs.length > 0 ? "ok" : undefined}>
                      {weekDprs.length > 0 ? "Filed" : "None"}
                    </Tag>
                  </Td>
                </Tr>
                <Tr>
                  <Td>Filed after the deadline</Td>
                  <Td center num>
                    {lateCount}
                  </Td>
                  <Td center>
                    <Tag kind={lateCount > 0 ? "warn" : "ok"}>
                      {lateCount > 0 ? "Late" : "On time"}
                    </Tag>
                  </Td>
                </Tr>
                <Tr alt>
                  <Td>This weekly submission</Td>
                  <Td center num>
                    {submission.approved_at ? formatShortDate(submission.approved_at) : "Draft"}
                  </Td>
                  <Td center>
                    <Tag kind={submission.status === "approved" ? "ok" : undefined}>
                      {submission.status === "approved" ? "Approved" : "Draft"}
                    </Tag>
                  </Td>
                </Tr>
                <Tr>
                  <Td>Amendments after submission</Td>
                  <Td center num>
                    {weekAmendmentsCount}
                  </Td>
                  <Td center>
                    <Tag kind={weekAmendmentsCount > 0 ? "warn" : "ok"}>
                      {weekAmendmentsCount > 0 ? "Pending" : "None"}
                    </Tag>
                  </Td>
                </Tr>
              </tbody>
            </table>
          </section>

          <section>
            <SectionHeading aside={formatWeekPeriod(submission.week_start)}>
              One week look-ahead
            </SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <thead>
                <tr>
                  <Th>Schedule task</Th>
                  <Th center>Due</Th>
                  <Th center>Now</Th>
                  <Th center>Plan</Th>
                  <Th center>Flag</Th>
                </tr>
              </thead>
              <tbody>
                {lookaheadTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="border-[0.7px] border-gca-green p-[8px] text-center text-gca-muted"
                    >
                      No tasks fall due this week.
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
                        {Math.round(Number(t.planned_pct_complete))}%
                      </Td>
                      <Td center>
                        {t.is_overdue ? (
                          <Tag kind="bad">Overdue</Tag>
                        ) : t.is_critical ? (
                          <Tag kind="warn">Critical</Tag>
                        ) : null}
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </section>

        {/* ===== Page 2 ===== */}
        <section className="report-page-break flex flex-col gap-[14px] p-[36px]">
          <section>
            <SectionHeading first>Project record</SectionHeading>
            <table className="w-full border-collapse text-[10.3px]">
              <tbody>
                <RecordRow label="Project ID" value={project.project_code} label2="Title" value2={project.name} />
                <RecordRow
                  label="Client"
                  value={project.client_name ?? "—"}
                  label2="Location"
                  value2={project.site_location ?? "—"}
                  alt
                />
                {mainContractor && (
                  <RecordRow label="Main contractor" value={mainContractor} label2="" value2="" />
                )}
                <RecordRow
                  label="Start on site"
                  value={formatLongDate(project.expected_start_date)}
                  label2="Contract completion"
                  value2={formatLongDate(project.expected_end_date)}
                  alt={!mainContractor}
                />
                <RecordRow
                  label="Forecast completion"
                  value={forecast.forecastDate ? formatLongDate(toIsoDate(forecast.forecastDate)) : "—"}
                  label2="Contract duration"
                  value2={fmtDays(forecast.contractDurationDays)}
                  alt={!!mainContractor}
                />
                <RecordRow
                  label="Calendar days expired"
                  value={fmtDays(forecast.calendarDaysExpired)}
                  label2="Time expired, contract"
                  value2={fmtPct1(timeExpiredContractPct)}
                  alt={!mainContractor}
                />
                <RecordRow
                  label="Time expired, forecast"
                  value={fmtPct1(timeExpiredForecastPct)}
                  label2="Allowable working days"
                  value2="6"
                  alt={!!mainContractor}
                />
                <RecordRow
                  label="Days worked this week"
                  value={String(weekDprs.length)}
                  label2=""
                  value2=""
                  alt={!mainContractor}
                />
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
                  value2={totalWeeks ? `${weekNumber(submission.week_start)} of ${totalWeeks}` : String(weekNumber(submission.week_start))}
                />
                <RecordRow
                  label="Reporting period"
                  value={formatWeekPeriod(submission.week_start)}
                  label2="Division process code"
                  value2={`WPR-${weekNumber(submission.week_start)}`}
                  alt
                />
                <RecordRow
                  label="Author and role"
                  value={authorLabel}
                  label2="Version control"
                  value2={String(submission.revision_no)}
                />
                <RecordRow
                  label="Source"
                  value={`${weekDprs.length} daily reports`}
                  label2="Issue status"
                  value2={submission.status === "approved" ? "Approved" : "Draft, not issued to client"}
                  alt
                />
              </tbody>
            </table>
          </section>
        </section>

        {/* ===== Page 3 ===== */}
        {weekDprs.length > 0 && (
          <section className="report-page-break flex flex-col gap-[14px] p-[36px]">
            <section>
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
            </section>

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
                <SectionHeading>Progress against schedule tasks</SectionHeading>
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
                    {Array.from(progressRows.values()).map((row, i) => (
                      <Tr key={row.label} alt={i % 2 === 1}>
                        <Td>{row.label}</Td>
                        <Td center num dim>
                          —
                        </Td>
                        <Td center num>
                          {row.toDate}%
                        </Td>
                        <Td center num>
                          +{row.gain}
                        </Td>
                      </Tr>
                    ))}
                    <Tr>
                      <Td className="bg-gca-stepper-from font-semibold" label>
                        Weighted project completion
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
          <section className="report-page-break flex flex-col gap-[14px] p-[36px]">
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

            {notedCategories.length > 0 && (
              <section>
                <SectionHeading first={personnelRows.size === 0}>Noted on the day</SectionHeading>
                <table className="w-full border-collapse text-[10.3px]">
                  <tbody>
                    {notedCategories.map((row, i) => (
                      <Tr key={row.label} alt={i % 2 === 1}>
                        <Td label>{row.label}</Td>
                        <Td>{row.value}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {photos.length > 0 && (
              <section>
                <SectionHeading
                  first={personnelRows.size === 0 && notedCategories.length === 0}
                  aside={`${photos.length} of ${totalCandidatePhotos} held in Project Nexus`}
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
                        <span className="text-gca-muted">· {formatShortDate(photo.report_date)}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-[12px] flex flex-col items-center gap-[7px]">
              <p className="text-[11px] font-bold italic text-gca-dark" style={jostStyle}>
                Prepared By
              </p>
              <div className="h-[17mm] w-[220px] border-t border-b border-gca-green" />
              <p className="mt-[2px] text-[11px] font-bold" style={jostStyle}>
                {submission.creator_name ?? "—"}
              </p>
            </section>
          </section>
        )}
      </div>
    );
  },
);

function SectionHeading({
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

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th
      className={`border-[0.7px] border-gca-green bg-gca-badge-bg p-[4.5px_8px] text-[9.8px] font-bold tracking-[0.01em] text-gca-dark ${
        center ? "text-center" : "text-left"
      }`}
      style={jostStyle}
    >
      {children}
    </th>
  );
}

function Tr({ children, alt }: { children: React.ReactNode; alt?: boolean }) {
  return <tr className={alt ? "bg-gca-page-bg" : undefined}>{children}</tr>;
}

function Td({
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
      style={jostStyle}
    >
      {children}
    </span>
  );
}

function RecordRow({
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
