"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import { useDpr } from "@/components/weekly-submission/use-weekly-submission-data";
import { EFFECTS_SEVERITY_LABEL, type DprDetail } from "@/components/weekly-submission/types";

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

export function DprDetailView({ projectId, dprId }: { projectId: string; dprId: string }) {
  const { data: project } = useProjectDetail(projectId);
  const { data: dpr } = useDpr(projectId, dprId);
  const [mode, setMode] = useState<ViewMode>("section");
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

  function exportDpr(kind: "pdf" | "csv" | "exco-csv") {
    if (kind === "pdf") {
      setExportOpen(false);
      window.print();
      return;
    }
    if (kind === "csv") {
      exportCsv(
        [
          ["Schedule task", "Completion today", "Completion total"],
          ...dpr!.activity_progress.map((a) => [
            a.task_name ?? a.free_text ?? "",
            `${a.today_pct}%`,
            `${a.total_pct}%`,
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

  const sections: Record<SectionId, React.ReactNode> = {
    conditions: <ConditionsSection dpr={dpr} />,
    effects: <EffectsSection dpr={dpr} />,
    "work-progress": <WorkProgressSection dpr={dpr} />,
    personnel: <PersonnelSection dpr={dpr} />,
    equipment: <EquipmentSection dpr={dpr} />,
    photos: <PhotosSection dpr={dpr} />,
    "sign-off": <SignOffSection dpr={dpr} />,
  };

  return (
    <div className="flex w-full justify-center bg-white p-[40px]">
      <div className="flex w-full max-w-[1084px] flex-col gap-[24px]">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-[16px]">
            <Link href={`/projects/${projectId}/weekly-submission`} className="text-[13px] font-medium text-gca-green">
              ← Submit
            </Link>
            <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
              {formatDate(dpr.report_date, { day: "numeric", month: "short", year: "numeric" })}
            </h1>
          </div>

          <div className="flex items-center gap-[12px]">
            <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
              <button
                onClick={() => setMode("section")}
                className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                  mode === "section"
                    ? "bg-white font-medium text-gca-dark shadow-[0px_1px_2px_0px_rgba(0,0,0,0.08)]"
                    : "font-normal text-gca-show"
                }`}
              >
                Section by section
              </button>
              <button
                onClick={() => setMode("full")}
                className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                  mode === "full"
                    ? "bg-white font-medium text-gca-dark shadow-[0px_1px_2px_0px_rgba(0,0,0,0.08)]"
                    : "font-normal text-gca-show"
                }`}
              >
                Full report
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setExportOpen((o) => !o)}
                className="flex cursor-pointer items-center gap-[8px] rounded-[8px] border border-gca-border bg-white px-[14px] py-[9px] text-[14px] font-semibold text-gca-dark"
              >
                Export
                <span className="text-[10px]">▾</span>
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-[44px] z-10 flex w-[238px] flex-col gap-[2px] rounded-[12px] border border-gca-border bg-white p-[6px] shadow-[0px_10px_28px_0px_rgba(23,48,31,0.08)]">
                  <button
                    onClick={() => exportDpr("pdf")}
                    className="flex cursor-pointer items-center gap-[10px] rounded-[6px] px-[10px] py-[9px] text-left hover:bg-gca-page-bg"
                  >
                    <span className="rounded-[4px] bg-error-bg px-[6px] py-[4px] text-[11px] font-bold text-error-text">
                      PDF
                    </span>
                    <span className="text-[14px] text-gca-dark">PDF document</span>
                  </button>
                  <button
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
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-[24px]">
          <div className="sticky top-[24px] flex max-h-[calc(100vh-48px)] w-[260px] shrink-0 flex-col gap-[16px] overflow-y-auto">
            <div className="flex flex-col gap-[2px] rounded-[12px] bg-white px-[24px] py-[20px]">
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

            <div className="flex w-[260px] flex-col gap-[25px] rounded-[12px] border border-gca-border bg-white px-[24px] py-[20px]">
              <p className="text-[14px] font-semibold text-gca-dark">DPR details</p>
              {detail("Project", project.project.name)}
              {detail("Site", dpr.site_location)}
              {detail("Date", formatDate(dpr.report_date, { weekday: "long", day: "numeric", month: "short", year: "numeric" }))}
              {detail("Submitted by", dpr.author_name)}
              {dpr.submitted_at && detail("Submitted", formatDateTime(dpr.submitted_at))}
            </div>
          </div>

          {mode === "section" ? (
            <div className="flex w-[800px] flex-col gap-[16px] pb-[24px]">
              {sections[activeSection]}
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
            <div className="flex w-[800px] flex-col gap-[48px] pb-[24px]">
              {SECTIONS.map((s) => (
                <div
                  key={s.id}
                  id={`section-${s.id}`}
                  ref={(el) => {
                    sectionRefs.current[s.id] = el;
                  }}
                  className="flex flex-col gap-[16px] scroll-mt-[96px]"
                >
                  {sections[s.id]}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">{children}</p>;
}

function ConditionsSection({ dpr }: { dpr: DprDetail }) {
  const temp =
    dpr.temp_min_c != null && dpr.temp_max_c != null
      ? `${dpr.temp_min_c}°C – ${dpr.temp_max_c}°C`
      : null;
  const fields = [
    detail("Weather", dpr.weather_category_name),
    detail("Temperature", temp),
    detail("Humidity", dpr.humidity_pct != null ? `${dpr.humidity_pct}%` : null),
    detail("Wind", dpr.wind),
    detail("Contract no.", dpr.contract_no),
  ].filter(Boolean);
  return (
    <>
      <SectionTitle>Conditions & references</SectionTitle>
      {fields.length === 0 ? (
        <p className="text-[13px] text-gca-muted">No conditions recorded for this day.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-[24px] gap-y-[20px]">{fields}</div>
      )}
    </>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  none: "bg-gca-badge-bg text-gca-green",
  minor: "bg-[#fdf6ea] text-gca-warning",
  significant: "bg-error-bg text-error-text",
  stoppage: "bg-error-bg text-error-text",
};

function EffectsSection({ dpr }: { dpr: DprDetail }) {
  return (
    <>
      <SectionTitle>Effects on work</SectionTitle>
      <span
        className={`w-fit rounded-full px-[10px] py-[4px] text-[13px] font-semibold ${SEVERITY_STYLE[dpr.effects_severity]}`}
      >
        {EFFECTS_SEVERITY_LABEL[dpr.effects_severity]}
      </span>
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
            <div key={w.work_item_id} className="flex gap-[12px] border-t border-gca-border py-[8px] text-[13px]">
              <span className="w-[120px] shrink-0 font-medium text-gca-dark">{w.work_area}</span>
              <span className="text-gca-dark">{w.work_carried_out}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col">
        <div className="flex items-center py-[8px] text-[12px] font-medium text-gca-muted">
          <p className="w-[320px]">Schedule task</p>
          <p className="w-[224px]">Completion</p>
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
              <div className="flex w-[320px] flex-col gap-[6px]">
                <p className="text-[13px] font-medium text-gca-dark">{a.task_name ?? a.free_text}</p>
                {a.source === "free_text" && (
                  <span className="w-fit rounded-full bg-[#fdf6ea] px-[8px] py-[2px] text-[13px] font-semibold text-gca-warning">
                    Not in schedule
                  </span>
                )}
              </div>
              <p className="w-[224px] font-mono text-[13px] text-gca-dark">
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
            <div key={g.personnel_group_id} className="rounded-[8px] border border-gca-border p-[16px]">
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
    detail("Other notes", dpr.other_notes_text),
  ].filter(Boolean);
  return (
    <>
      <SectionTitle>Equipment & noted on the day</SectionTitle>
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
        <div className="grid grid-cols-2 gap-[16px]">
          {dpr.photos.map((p) => (
            <div key={p.photo_id} className="flex flex-col gap-[6px]">
              {/* eslint-disable-next-line @next/next/no-img-element -- external, unconfigured image hosts */}
              <img src={p.url} alt={p.caption ?? "Site photo"} className="h-[240px] w-full rounded-[8px] object-cover" />
              <p className="text-[13px] text-gca-show">
                {p.caption ?? "Untitled"}
                {p.taken_at && ` · ${new Date(p.taken_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
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
      <div className="grid grid-cols-3 gap-x-[24px] gap-y-[20px]">
        {detail("DPR reference", dpr.dpr_ref)}
        {detail("Status", dpr.status === "submitted" ? "Submitted" : "Draft")}
        {detail("Submitted by", dpr.submitted_by_name)}
        {dpr.submitted_at && detail("Submitted", formatDateTime(dpr.submitted_at))}
        {dpr.status === "submitted" &&
          detail("Timeliness", dpr.is_late ? "Late" : "On time")}
      </div>
    </>
  );
}
