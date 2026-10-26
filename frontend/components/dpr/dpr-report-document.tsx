import type { ProjectDetail, StageRow } from "@/components/project-overview/types";
import { formatLongDate } from "@/components/milestones/types";
import { EFFECTS_SEVERITY_LABEL, type DprDetail } from "@/components/weekly-submission/types";
import {
  RecordRow,
  SectionHeading,
  Td,
  Th,
  Tr,
} from "@/components/weekly-submission/weekly-report-document";

/** Equipment, visitors, delays, incidents and rejected materials are captured as comma
 *  separated entries, so the report lists them rather than printing one run-on line. */
function csvItems(text: string | null): string[] {
  return (text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Each entry on its own line, so a long list reads as a list rather than a paragraph. */
function CsvSection({ title, text }: { title: string; text: string | null }) {
  const items = csvItems(text);
  return (
    <section>
      <SectionHeading>{title}</SectionHeading>
      {items.length === 0 ? (
        <p className="text-[10.3px] leading-[1.58] text-gca-muted">None recorded.</p>
      ) : (
        <ul className="flex flex-col gap-[2px] text-[10.3px] leading-[1.58]">
          {items.map((item, i) => (
            <li key={i} className="flex gap-[7px]">
              <span className="text-gca-green">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Photographs are stamped with the time of day: the report already carries the date. */
function formatTakenAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const NOTED_FIELDS = [
  ["Equipment on site", "equipment_text"],
  ["Visitors", "visitors_text"],
  ["Delays", "delays_text"],
  ["Incidents", "incidents_text"],
  ["Materials rejected", "materials_rejected_text"],
] as const;

/** One day's report as the printed sheet, matching the weekly report's paper. The browser's
 *  own print engine produces the PDF (see the `#report-print-root` rules in globals.css). */
export function DprReportDocument({
  project,
  stages,
  dpr,
}: {
  project: ProjectDetail;
  stages: StageRow[];
  dpr: DprDetail;
}) {
  const stageName = stages.find((s) => s.stage_no === dpr.stage_no)?.stage_name;
  const temp =
    dpr.temp_min_c != null && dpr.temp_max_c != null
      ? `${dpr.temp_min_c}°C – ${dpr.temp_max_c}°C`
      : "—";
  const totalHeadcount = dpr.personnel_groups.reduce((sum, g) => sum + g.total_headcount, 0);

  return (
    <div id="report-print-root" className="report-paper mx-auto w-full max-w-[800px] bg-white text-gca-dark">
      <section className="flex flex-col gap-[14px] px-[36px] pt-[20px] pb-[14px]">
        <header className="flex items-end justify-between p-[20px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/GCA Logo.svg" alt="Gas Connect Africa" className="h-[28px] w-auto" />
          <p className="text-right text-[10.3px] font-extralight leading-[1.6] text-gca-muted">
            {dpr.dpr_ref ?? `${project.project_code}-DPR`}
          </p>
        </header>

        <div className="flex flex-col items-center border-gca-green py-[11px] text-center">
          <h1 className="mb-[5px] text-[19px] font-bold text-gca-badge-text">
            Daily Progress Report
          </h1>
          <p className="mb-[4px] text-[12.5px] font-bold text-gca-green-hover">{project.name}</p>
          <p className="text-[10.5px] text-gca-show">{formatLongDate(dpr.report_date)}</p>
        </div>

        <section>
          <SectionHeading first>Project record</SectionHeading>
          <table className="w-full border-collapse text-[10.3px]">
            <tbody>
              <RecordRow
                label="Project"
                value={project.name}
                label2="Site"
                value2={dpr.site_location}
              />
              <RecordRow
                alt
                label="Stage"
                value={stageName ?? `Stage ${dpr.stage_no}`}
                label2="Site engineer"
                value2={dpr.author_name}
              />
            </tbody>
          </table>
        </section>

        <section>
          <SectionHeading>Weather and site conditions</SectionHeading>
          <table className="w-full border-collapse text-[10.3px]">
            <tbody>
              <RecordRow
                label="Weather"
                value={dpr.weather_category_name ?? "—"}
                label2="Temperature"
                value2={temp}
              />
              <RecordRow
                alt
                label="Humidity"
                value={dpr.humidity_pct != null ? `${dpr.humidity_pct}%` : "—"}
                label2="Wind"
                value2={dpr.wind ?? "—"}
              />
            </tbody>
          </table>
        </section>

        <section>
          <SectionHeading aside={`${totalHeadcount} on site`}>Personnel</SectionHeading>
          <table className="w-full border-collapse text-[10.3px]">
            <thead>
              <tr>
                <Th>Contractor</Th>
                <Th>Roles</Th>
                <Th center>Headcount</Th>
              </tr>
            </thead>
            <tbody>
              {dpr.personnel_groups.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="border-[0.7px] border-gca-green p-[8px] text-center text-gca-muted"
                  >
                    No personnel recorded for this day.
                  </td>
                </tr>
              ) : (
                <>
                  {dpr.personnel_groups.map((g, i) => (
                    <Tr key={g.personnel_group_id} alt={i % 2 === 1}>
                      <Td>{g.contractor_name}</Td>
                      <Td>
                        {g.role_counts.length === 0
                          ? "—"
                          : g.role_counts.map((r) => `${r.role_name}: ${r.headcount}`).join(", ")}
                      </Td>
                      <Td center num>
                        {g.total_headcount}
                      </Td>
                    </Tr>
                  ))}
                  <Tr>
                    <Td label>Total on site</Td>
                    <Td>{null}</Td>
                    <Td center num className="font-bold">
                      {totalHeadcount}
                    </Td>
                  </Tr>
                </>
              )}
            </tbody>
          </table>
        </section>

        <section>
          <SectionHeading>Work carried out</SectionHeading>
          <table className="w-full border-collapse text-[10.3px]">
            <thead>
              <tr>
                <Th>Work area</Th>
                <Th>Work done</Th>
              </tr>
            </thead>
            <tbody>
              {dpr.work_items.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="border-[0.7px] border-gca-green p-[8px] text-center text-gca-muted"
                  >
                    No work recorded for this day.
                  </td>
                </tr>
              ) : (
                dpr.work_items.map((w, i) => (
                  <Tr key={w.work_item_id} alt={i % 2 === 1}>
                    <Td className="w-[42mm]">{w.work_area}</Td>
                    <Td>{w.work_carried_out}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section>
          <SectionHeading>Schedule task progress</SectionHeading>
          <table className="w-full border-collapse text-[10.3px]">
            <thead>
              <tr>
                <Th>Schedule task</Th>
                <Th center>Today</Th>
                <Th center>Total</Th>
              </tr>
            </thead>
            <tbody>
              {dpr.activity_progress.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="border-[0.7px] border-gca-green p-[8px] text-center text-gca-muted"
                  >
                    No activity progress recorded.
                  </td>
                </tr>
              ) : (
                dpr.activity_progress.map((a, i) => (
                  <Tr key={a.dpr_activity_progress_id} alt={i % 2 === 1}>
                    <Td>
                      {a.task_name ?? a.free_text}
                      {a.source === "free_text" && (
                        <span className="text-gca-muted"> (not in schedule)</span>
                      )}
                    </Td>
                    <Td center num>
                      {a.today_pct}%
                    </Td>
                    <Td center num>
                      {a.total_pct}%
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section>
          <SectionHeading
            aside={dpr.effects_text ? EFFECTS_SEVERITY_LABEL[dpr.effects_severity] : undefined}
          >
            Effects on work
          </SectionHeading>
          <p className="max-w-[62em] text-[10.3px] leading-[1.58] whitespace-pre-line">
            {dpr.effects_text || "No effects on work reported."}
          </p>
        </section>

        {NOTED_FIELDS.map(([label, field]) => (
          <CsvSection key={field} title={label} text={dpr[field]} />
        ))}

        {dpr.other_notes_text && (
          <section>
            <SectionHeading>Other notes</SectionHeading>
            <p className="max-w-[62em] text-[10.3px] leading-[1.58] whitespace-pre-line">
              {dpr.other_notes_text}
            </p>
          </section>
        )}

        {dpr.photos.length > 0 && (
          <section>
            <SectionHeading aside={`${dpr.photos.length} total`}>Site photographs</SectionHeading>
            <div className="grid grid-cols-3 gap-[7px]">
              {dpr.photos.map((photo) => (
                <figure key={photo.photo_id} className="m-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption ?? "Site photograph"}
                    crossOrigin="anonymous"
                    className="h-[120px] w-full border-[0.8px] border-gca-green object-cover"
                  />
                  <figcaption className="mt-[3px] truncate text-[9.2px] leading-[1.3] text-gca-show">
                    {photo.caption ?? "Untitled"}
                    {photo.taken_at && (
                      <span className="text-gca-muted"> · {formatTakenAt(photo.taken_at)}</span>
                    )}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  );
}
