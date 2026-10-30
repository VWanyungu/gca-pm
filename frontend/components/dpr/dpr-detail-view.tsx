"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import { useDpr } from "@/components/weekly-submission/use-weekly-submission-data";
import {
  EFFECTS_SEVERITY_LABEL,
  mondayOf,
  type DprDetail,
} from "@/components/weekly-submission/types";
import { ArrowLeft, ChevronDown, ChevronUp, Download } from "lucide-react";
import { SectionTocSheet } from "@/components/ui/section-toc-sheet";
import { DprReportDocument } from "./dpr-report-document";

const SECTIONS = [
  { id: "conditions", label: "Conditions & references" },
  { id: "effects", label: "Effects on work" },
  { id: "work-progress", label: "Work & progress" },
  { id: "personnel", label: "Personnel on site" },
  { id: "equipment", label: "Equipment & noted on the day" },
  { id: "photos", label: "Site photos" },
  { id: "sign-off", label: "Sign-off" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type ViewMode = "section" | "full";

// Hoisted function declarations, so this is safe to evaluate here.
const SECTION_RENDERERS: Record<SectionId, (dpr: DprDetail) => React.ReactNode> = {
  conditions: (dpr) => <ConditionsSection dpr={dpr} />,
  effects: (dpr) => <EffectsSection dpr={dpr} />,
  "work-progress": (dpr) => <WorkProgressSection dpr={dpr} />,
  personnel: (dpr) => <PersonnelSection dpr={dpr} />,
  equipment: (dpr) => <EquipmentSection dpr={dpr} />,
  photos: (dpr) => <PhotosSection dpr={dpr} />,
  "sign-off": (dpr) => <SignOffSection dpr={dpr} />,
};

function formatDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    ...opts,
    timeZone: "UTC",
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${d.toLocaleTimeString(
    "en-GB",
    { hour: "2-digit", minute: "2-digit" },
  )}`;
}

function detail(label: string, value: string | null | undefined) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-[2px]" key={label}>
      <p className="text-[11px] font-medium text-gca-muted">{label}</p>
      <p className="text-[14px] font-medium text-gca-dark">{value}</p>
    </div>
  );
}

export function DprDetailView({
  projectId,
  dprId,
  backTo,
}: {
  projectId: string;
  dprId: string;
  backTo: "submit" | "dpr";
}) {
  const { data: project } = useProjectDetail(projectId);
  const { data: dpr } = useDpr(projectId, dprId);
  const [mode, setMode] = useState<ViewMode>("full");
  const [activeSection, setActiveSection] = useState<SectionId>(SECTIONS[0].id);
  const [exportOpen, setExportOpen] = useState(false);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (mode !== "full") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSection(visible.target.id.replace("section-", "") as SectionId);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [mode, dpr]);

  if (!project || !dpr) return null;

  const activeIndex = SECTIONS.findIndex((s) => s.id === activeSection);
  const prevSection = activeIndex > 0 ? SECTIONS[activeIndex - 1] : null;
  const nextSection = activeIndex < SECTIONS.length - 1 ? SECTIONS[activeIndex + 1] : null;
  const weekStart = mondayOf(new Date(`${dpr.report_date.slice(0, 10)}T12:00:00`));
  const backHref =
    backTo === "dpr"
      ? `/projects/${projectId}/dpr`
      : `/projects/${projectId}/weekly-submission?weekStart=${weekStart}`;

  // Written once, placed in the lg rail and in the band that replaces it below lg.
  const dprDetailFields = (
    <>
      {detail("Project", project.project.name)}
      {detail("Site", dpr.site_location)}
      {detail(
        "Date",
        formatDate(dpr.report_date, {
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      )}
      {detail("Submitted by", dpr.author_name)}
      {dpr.submitted_at && detail("Submitted", formatDateTime(dpr.submitted_at))}
    </>
  );

  function goToSection(id: SectionId) {
    setActiveSection(id);
    if (mode === "full") {
      sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function exportCsv(rows: string[][], filename: string) {
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  function printReport() {
    if (!dpr) return;
    setExportOpen(false);
    // Chrome names the PDF after the document title.
    const previousTitle = document.title;
    document.title = `${dpr.dpr_ref ?? dpr.report_date.slice(0, 10)}-dpr`;
    const restore = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  }

  function exportDpr(kind: "pdf" | "csv" | "exco-csv") {
    if (kind === "pdf") {
      printReport();
      return;
    }
    if (kind === "csv") {
      exportCsv(
        [
          ["Schedule task", "Completion today", "Completion total"],
          ...dpr!.activity_progress.map((a) => [
            a.task_name ?? a.free_text ?? "",
            `${Math.round(a.today_pct)}%`,
            `${Math.round(a.total_pct)}%`,
          ]),
        ],
        `${dpr!.dpr_ref ?? dpr!.dpr_id}-activities.csv`,
      );
      return;
    }
    exportCsv(
      [
        ["DPR", "Date", "Status", "Effects severity", "Submitted by", "Submitted"],
        [
          dpr!.dpr_ref ?? dpr!.dpr_id,
          dpr!.report_date,
          dpr!.status,
          dpr!.effects_severity,
          dpr!.submitted_by_name ?? "",
          dpr!.submitted_at ?? "",
        ],
      ],
      `${dpr!.dpr_ref ?? dpr!.dpr_id}-exco-summary.csv`,
    );
  }

  return (
    <div className="flex w-full max-w-[1100px] flex-col gap-[24px] p-[20px] md:p-[40px] bg-gca-surface">
      <div className="flex items-end justify-between gap-[12px]">
        <div className="flex min-w-0 flex-col gap-[16px]">
          <Link
            href={backHref}
            className="text-[13px] font-medium text-gca-green flex items-center gap-[6px]"
          >
            <ArrowLeft size={18} /> {backTo === "dpr" ? "DPRs" : "Submit"}
          </Link>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
            {formatDate(dpr.report_date, { day: "numeric", month: "short", year: "numeric" })}
          </h1>
        </div>
        <div className="flex items-end justify-between">
          {/* <div className="flex items-center gap-[12px]">
            <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
              <button
                onClick={() => setMode("section")}
                className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                  mode === "section"
                    ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_2px_0px_rgba(0,0,0,0.08)]"
                    : "font-normal text-gca-show"
                }`}
              >
                Section by section
              </button>
              <button
                onClick={() => setMode("full")}
                className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                  mode === "full"
                    ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_2px_0px_rgba(0,0,0,0.08)]"
                    : "font-normal text-gca-show"
                }`}
              >
                Full report
              </button>
            </div> */}

          <div className="relative">
            {/* <button
                onClick={() => setExportOpen((o) => !o)}
                className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[14px] py-[9px] text-[14px] font-semibold text-gca-dark"
              >
                Export
                {exportOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button> */}

            <button
              onClick={() => exportDpr("pdf")}
              className="flex cursor-pointer items-center gap-[10px] rounded-[6px] px-[10px] py-[9px] text-left bg-gca-page-bg px-[6px] py-[4px] text-[13px]"
            >
              {/* <span className="rounded-[4px] font-bold text-gca-green">PDF</span> */}
              <Download size={18} className="font-bold text-gca-green" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-[44px] z-10 flex w-[238px] flex-col gap-[2px] rounded-[12px] border border-gca-border bg-gca-surface p-[6px] shadow-[0px_10px_28px_0px_rgba(23,48,31,0.08)]">
                <button
                  onClick={() => exportDpr("pdf")}
                  className="flex cursor-pointer items-center gap-[10px] rounded-[6px] px-[10px] py-[9px] text-left hover:bg-gca-page-bg"
                >
                  <span className="rounded-[4px] bg-error-bg px-[6px] py-[4px] text-[11px] font-bold text-error-text">
                    PDF
                  </span>
                  <span className="text-[14px] text-gca-dark">PDF document</span>
                </button>
                {/* <button
                    onClick={() => exportDpr("csv")}
                    className="flex cursor-pointer items-center gap-[10px] rounded-[6px] px-[10px] py-[9px] text-left hover:bg-gca-page-bg"
                  >
                    <span className="rounded-[4px] bg-gca-badge-bg px-[6px] py-[4px] text-[11px] font-bold text-gca-green">
                      CSV
                    </span>
                    <span className="text-[14px] text-gca-dark">CSV</span>
                  </button>
                  <button
                    onClick={() => exportDpr("exco-csv")}
                    className="flex cursor-pointer items-center gap-[10px] rounded-[6px] px-[10px] py-[9px] text-left hover:bg-gca-page-bg"
                  >
                    <span className="rounded-[4px] bg-gca-badge-bg px-[6px] py-[4px] text-[11px] font-bold text-gca-green">
                      CSV
                    </span>
                    <span className="text-[14px] text-gca-dark">ExCo summary CSV</span>
                  </button> */}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Below lg the details read as a band under the heading and the section list moves
              into the floating Contents sheet — a 260px rail would leave no room for the report. */}
      <div className="flex flex-col gap-[16px] rounded-[12px] border border-gca-border bg-gca-surface p-[16px] lg:hidden">
        <p className="text-[14px] font-semibold text-gca-dark">DPR details</p>
        <div className="grid grid-cols-2 gap-x-[24px] gap-y-[16px]">{dprDetailFields}</div>
      </div>

      <SectionTocSheet
        sections={SECTIONS}
        activeId={activeSection}
        onSelect={(id) => goToSection(id as SectionId)}
      />

      <div className="flex flex-col gap-[16px] lg:flex-row lg:items-start lg:gap-[24px]">
        <div className="sticky top-[24px] hidden max-h-[calc(100vh-48px)] w-[260px] shrink-0 flex-col gap-[16px] overflow-y-auto lg:flex">
          <div className="flex flex-col gap-[2px] rounded-[12px] bg-gca-surface px-[24px] py-[20px]">
            <p className="mb-[14px] text-[12px] font-semibold text-gca-muted">Sections</p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => goToSection(s.id)}
                className={`w-[212px] cursor-pointer rounded-[6px] px-[10px] py-[7px] text-left text-[13px] ${
                  activeSection === s.id
                    ? "bg-gca-badge-bg font-semibold text-gca-green"
                    : "font-normal text-gca-show hover:bg-gca-page-bg"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex w-[260px] flex-col gap-[25px] rounded-[12px] border border-gca-border bg-gca-surface px-[24px] py-[20px]">
            <p className="text-[14px] font-semibold text-gca-dark">DPR details</p>
            {dprDetailFields}
          </div>
        </div>

        {mode === "section" ? (
          <div className="flex min-w-0 flex-1 flex-col gap-[16px] pb-[24px]">
            {SECTION_RENDERERS[activeSection](dpr)}
            <div className="flex items-center justify-between border-t border-gca-border pt-[16px] text-[13px] font-medium text-gca-green">
              <button
                onClick={() => prevSection && goToSection(prevSection.id)}
                className={`cursor-pointer ${!prevSection && "invisible"}`}
              >
                ← {prevSection?.label}
              </button>
              <button
                onClick={() => nextSection && goToSection(nextSection.id)}
                className={`cursor-pointer ${!nextSection && "invisible"}`}
              >
                {nextSection?.label} →
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-[48px] pb-[24px]">
            {SECTIONS.map((s) => (
              <div
                key={s.id}
                id={`section-${s.id}`}
                ref={(el) => {
                  sectionRefs.current[s.id] = el;
                }}
                className="flex flex-col gap-[16px] scroll-mt-[96px]"
              >
                {SECTION_RENDERERS[s.id](dpr)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden">
        <DprReportDocument project={project.project} stages={project.stages} dpr={dpr} />
      </div>
    </div>
  );
}

/** Sections worth reading mid-submission. Sign-off is omitted: the strip row already
 * carries the site, engineer, submitted time and timeliness. */
const INLINE_SECTIONS = SECTIONS.filter((s) => s.id !== "sign-off");

/**
 * One day's report opened in place, inside the week strip. Height is capped so the
 * commentary below it does not get pushed off the screen.
 */
export function DprInlineReport({ projectId, dprId }: { projectId: string; dprId: string }) {
  const { data: dpr } = useDpr(projectId, dprId);

  if (!dpr) return <InlineReportSkeleton />;

  return (
    <CompactSectionTitles.Provider value={true}>
      {/* Indented, so the report reads as a child of the row rather than a continuation
          of its columns. No room for the step at phone width. */}
      <div className="dpr-reveal flex flex-col gap-[16px] pt-[20px] pb-[8px] md:pl-[24px]">
        <div className="dpr-scroll flex max-h-[min(560px,60vh)] flex-col gap-[32px] overflow-y-auto pr-[12px]">
          {INLINE_SECTIONS.map((s) => (
            <div key={s.id} className="flex flex-col gap-[16px]">
              {SECTION_RENDERERS[s.id](dpr)}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-[16px] border-t border-gca-border pt-[12px]">
          <p className="font-mono text-[12px] text-gca-muted">{dpr.dpr_ref ?? "No reference"}</p>
          <Link
            href={`/projects/${projectId}/dpr/${dprId}?back=submit`}
            className="rounded-[6px] text-[13px] font-medium text-gca-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gca-green hover:underline hover:underline-offset-[3px]"
          >
            Open full report
          </Link>
        </div>
      </div>
    </CompactSectionTitles.Provider>
  );
}

function InlineReportSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading report" className="animate-pulse pt-[20px]">
      <div className="flex flex-col gap-[16px]">
        <div className="h-[20px] w-[180px] rounded-[6px] bg-gca-page-bg" />
        <div className="grid grid-cols-2 gap-x-[24px] gap-y-[20px] sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((field) => (
            <div key={field} className="flex flex-col gap-[6px]">
              <div className="h-[11px] w-[64px] rounded-[4px] bg-gca-page-bg" />
              <div className="h-[14px] w-[96px] rounded-[4px] bg-gca-page-bg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Inside the week strip these titles sit below the submission's own 16px headings,
 * so they are a level quieter than on the full report page. */
const CompactSectionTitles = createContext(false);

function SectionTitle({ children }: { children: React.ReactNode }) {
  const compact = useContext(CompactSectionTitles);
  return (
    <p
      className={
        compact
          ? "text-[14px] font-semibold text-gca-dark"
          : "text-[18px] font-semibold tracking-[-0.27px] text-gca-dark"
      }
    >
      {children}
    </p>
  );
}

function ConditionsSection({ dpr }: { dpr: DprDetail }) {
  const temp =
    dpr.temp_min_c != null && dpr.temp_max_c != null
      ? `${Math.round(dpr.temp_min_c)}°C – ${Math.round(dpr.temp_max_c)}°C`
      : null;
  const fields = [
    detail("Weather", dpr.weather_category_name),
    detail("Temperature", temp),
    detail("Humidity", dpr.humidity_pct != null ? `${Math.round(dpr.humidity_pct)}%` : null),
    detail("Wind", dpr.wind),
    detail("Contract no.", dpr.contract_no),
  ].filter(Boolean);
  return (
    <>
      <SectionTitle>Conditions & references</SectionTitle>
      {fields.length === 0 ? (
        <p className="text-[13px] text-gca-muted">No conditions recorded for this day.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-[24px] gap-y-[20px] sm:grid-cols-3">{fields}</div>
      )}
    </>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  none: "bg-gca-badge-bg text-gca-green",
  minor: "bg-gca-warning-bg text-gca-warning",
  significant: "bg-error-bg text-error-text",
  stoppage: "bg-error-bg text-error-text",
};

function EffectsSection({ dpr }: { dpr: DprDetail }) {
  return (
    <>
      <SectionTitle>Effects on work</SectionTitle>
      {dpr.effects_text && (
        <span
          className={`w-fit rounded-full px-[10px] py-[4px] text-[13px] font-semibold ${SEVERITY_STYLE[dpr.effects_severity]}`}
        >
          {EFFECTS_SEVERITY_LABEL[dpr.effects_severity]}
        </span>
      )}
      <p className="whitespace-pre-line text-[13px] text-gca-dark">
        {dpr.effects_text || "No effects on work reported."}
      </p>
    </>
  );
}

function WorkProgressSection({ dpr }: { dpr: DprDetail }) {
  return (
    <>
      <SectionTitle>Work & progress</SectionTitle>

      {dpr.work_items.length > 0 && (
        <div className="flex flex-col gap-[8px]">
          <p className="text-[12px] font-medium text-gca-muted">Work carried out</p>
          {dpr.work_items.map((w) => (
            <div
              key={w.work_item_id}
              className="flex flex-col gap-[4px] border-t border-gca-border py-[8px] text-[13px] sm:flex-row sm:gap-[12px]"
            >
              <span className="font-medium text-gca-dark sm:w-[120px] sm:shrink-0">
                {w.work_area}
              </span>
              <span className="text-gca-dark">{w.work_carried_out}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        <div className="flex items-center gap-[12px] py-[8px] text-[12px] font-medium text-gca-muted">
          <p className="min-w-0 flex-1">Schedule task</p>
          <p className="w-[124px] shrink-0">Completion</p>
        </div>
        {dpr.activity_progress.length === 0 ? (
          <p className="border-t border-gca-border py-[12px] text-[13px] text-gca-muted">
            No activity progress recorded.
          </p>
        ) : (
          dpr.activity_progress.map((a) => (
            <div
              key={a.dpr_activity_progress_id}
              className="flex items-start gap-[12px] border-t border-gca-border py-[12px]"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
                <p className="text-[13px] font-medium text-gca-dark">
                  {a.task_name ?? a.free_text}
                </p>
                {a.source === "free_text" && (
                  <span className="w-fit rounded-full bg-gca-warning-bg px-[8px] py-[2px] text-[13px] font-semibold text-gca-warning">
                    Not in schedule
                  </span>
                )}
              </div>
              <p className="w-[124px] shrink-0 font-mono text-[13px] text-gca-dark tabular-nums">
                {a.today_pct}% → {a.total_pct}%
              </p>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function PersonnelSection({ dpr }: { dpr: DprDetail }) {
  return (
    <>
      <SectionTitle>Personnel on site</SectionTitle>
      {dpr.personnel_groups.length === 0 ? (
        <p className="text-[13px] text-gca-muted">No personnel recorded for this day.</p>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {dpr.personnel_groups.map((g) => (
            <div
              key={g.personnel_group_id}
              className="rounded-[8px] border border-gca-border p-[16px]"
            >
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-gca-dark">{g.contractor_name}</p>
                <p className="font-mono text-[13px] text-gca-dark">{g.total_headcount} on site</p>
              </div>
              {g.role_counts.length > 0 && (
                <div className="mt-[8px] flex flex-wrap gap-[8px]">
                  {g.role_counts.map((r) => (
                    <span
                      key={r.personnel_role_id}
                      className="rounded-full bg-gca-page-bg px-[10px] py-[4px] text-[13px] text-gca-dark"
                    >
                      {r.role_name}: {r.headcount}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function EquipmentSection({ dpr }: { dpr: DprDetail }) {
  const fields = [
    detail("Equipment on site", dpr.equipment_text),
    detail("Visitors", dpr.visitors_text),
    detail("Delays", dpr.delays_text),
    detail("Incidents", dpr.incidents_text),
    detail("Materials rejected", dpr.materials_rejected_text),
    detail("Other notes", dpr.other_notes_text),
  ].filter(Boolean);
  return (
    <>
      <SectionTitle>Noted on the day</SectionTitle>
      {fields.length === 0 ? (
        <p className="text-[13px] text-gca-muted">Nothing noted for this day.</p>
      ) : (
        <div className="flex flex-col gap-[16px]">{fields}</div>
      )}
    </>
  );
}

function PhotosSection({ dpr }: { dpr: DprDetail }) {
  return (
    <>
      <SectionTitle>Site photos</SectionTitle>
      {dpr.photos.length === 0 ? (
        <p className="text-[13px] text-gca-muted">No photos attached to this DPR.</p>
      ) : (
        <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-2">
          {dpr.photos.map((p) => (
            <div key={p.photo_id} className="flex flex-col gap-[6px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- external, unconfigured image hosts */}
              <img
                src={p.url}
                alt={p.caption ?? "Site photo"}
                className="h-[240px] w-full rounded-[8px] object-cover"
              />
              <p className="text-[13px] text-gca-show">
                {p.caption ?? "Untitled"}
                {p.taken_at &&
                  ` · ${new Date(p.taken_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function SignOffSection({ dpr }: { dpr: DprDetail }) {
  return (
    <>
      <SectionTitle>Sign-off</SectionTitle>
      <div className="grid grid-cols-2 gap-x-[24px] gap-y-[20px] sm:grid-cols-3">
        {detail("DPR reference", dpr.dpr_ref)}
        {detail("Status", dpr.status === "submitted" ? "Submitted" : "Draft")}
        {detail("Submitted by", dpr.submitted_by_name)}
        {dpr.submitted_at && detail("Submitted", formatDateTime(dpr.submitted_at))}
        {dpr.status === "submitted" && detail("Timeliness", dpr.is_late ? "Late" : "On time")}
      </div>
    </>
  );
}
