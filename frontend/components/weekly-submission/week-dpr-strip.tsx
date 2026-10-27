"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { TeamMember } from "@/components/project-overview/types";
import { DprInlineReport } from "@/components/dpr/dpr-detail-view";
import { useWeekDprs } from "./use-weekly-submission-data";
import type { DprSummary } from "./types";
import { addDays } from "./types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function authorName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

/** Reading order within a day: by site, so two sites always list the same way round. */
export function sortWeekDprs(dprs: DprSummary[]) {
  return [...dprs].sort(
    (a, b) =>
      a.report_date.localeCompare(b.report_date) ||
      a.site_location.localeCompare(b.site_location) ||
      a.dpr_id.localeCompare(b.dpr_id),
  );
}

export function WeekDprStrip({
  projectId,
  weekStart,
  team,
  onPrevWeek,
  onNextWeek,
}: {
  projectId: string;
  weekStart: string;
  team: TeamMember[];
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}) {
  const { data: dprs = [] } = useWeekDprs(projectId, weekStart);
  const searchParams = useSearchParams();
  const todayIso = new Date().toISOString().slice(0, 10);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [openDprId, setOpenDprIdState] = useState<string | null>(() => searchParams.get("dpr"));

  // Mirrors the open report into the URL so it survives a refresh and can be sent to
  // someone, without a route change that would unmount the submission.
  function setOpenDprId(dprId: string | null) {
    setOpenDprIdState(dprId);
    const url = new URL(window.location.href);
    if (dprId) url.searchParams.set("dpr", dprId);
    else url.searchParams.delete("dpr");
    window.history.replaceState(null, "", url);
  }

  const weekDprs = useMemo(() => sortWeekDprs(dprs), [dprs]);
  const openDpr = openDprId ? weekDprs.find((d) => d.dpr_id === openDprId) : undefined;
  const openDay = openDpr ? openDpr.report_date : expandedDay;

  function toggleDay(date: string) {
    setExpandedDay(openDay === date ? null : date);
    setOpenDprId(null);
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayDprs = openDay ? weekDprs.filter((d) => d.report_date === openDay) : [];

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div>
        <h3 className="text-[16px] font-semibold text-gca-dark">DPRs this week</h3>
        {/* <p className="mt-[2px] text-[13px] text-gca-show">Red days have a missing DPR</p> */}
      </div>

      {/* The week arrows keep their place at the ends; the seven days swipe between them,
          since all seven never fit across a phone. */}
      <div className="flex w-full items-center gap-[8px] sm:gap-[24px]">
        <button
          onClick={onPrevWeek}
          aria-label="Previous week"
          className="shrink-0 p-[8px] rounded-lg border border-gca-border cursor-pointer text-gca-muted hover:text-gca-dark disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!onPrevWeek}
        >
          <ChevronLeft className="size-[16px]" />
        </button>

        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-[4px] overflow-x-auto sm:justify-between sm:gap-[16px]">
          {days.map((date, i) => {
            const isFuture = date > todayIso;
            const hasDpr = weekDprs.some((d) => d.report_date === date);
            const isMissing = !isFuture && !hasDpr;
            const isOpen = openDay === date;
            return (
              <button
                key={date}
                onClick={() => !isFuture && toggleDay(date)}
                disabled={isFuture}
                aria-expanded={isFuture ? undefined : isOpen}
                className={`py-[8px] px-[8px] sm:px-[12px] flex shrink-0 cursor-pointer items-center gap-[4px] text-[14px] sm:text-[15px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gca-green disabled:cursor-not-allowed disabled:text-gca-muted ${isOpen && "bg-gca-badge-bg rounded-lg"} ${!isMissing || isOpen ? "" : "text-error-text"}`}
              >
                {DAY_LABELS[i]} {new Date(`${date}T00:00:00Z`).getUTCDate()}
                {!isFuture &&
                  (isOpen ? (
                    <ChevronUp className="size-[18]" />
                  ) : (
                    <ChevronDown className="size-[18]" />
                  ))}
              </button>
            );
          })}
        </div>

        <button
          onClick={onNextWeek}
          aria-label="Next week"
          className="shrink-0 p-[8px] rounded-lg border border-gca-border cursor-pointer text-gca-muted hover:text-gca-dark disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!onNextWeek}
        >
          <ChevronRight className="size-[16px]" />
        </button>
      </div>

      {openDay && (
        <div className="flex flex-col gap-[8px] border-t border-gca-border py-[16px]">
          <h3 className="text-[16px] font-semibold text-gca-dark">
            {new Date(openDay).toDateString()}
          </h3>

          <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_28px] gap-[12px] border-b border-gca-border pb-[4px] text-[12px] font-medium text-gca-muted md:grid">
            <span>Site</span>
            <span>Engineer</span>
            <span>Submitted</span>
            <span>Status</span>
            <span className="sr-only">Report</span>
          </div>

          {dayDprs.length === 0 ? (
            <p className="text-[13px] text-error-text text-center py-[12px]">
              No DPR submitted for this day.
            </p>
          ) : (
            dayDprs.map((dpr) => {
              const isOpen = openDprId === dpr.dpr_id;
              return (
                <div
                  key={dpr.dpr_id}
                  // Open: the row and its report become one recessed block. The fill
                  // bleeds past the gutters so the columns do not shift on expand.
                  className={`flex flex-col border-b ${
                    isOpen
                      ? "-mx-[16px] rounded-[8px] border-transparent bg-gca-page-bg px-[16px] pt-[12px] pb-[16px]"
                      : "border-gca-border"
                  }`}
                >
                  <button
                    onClick={() => {
                      // Closing commits the day, so a report opened straight from the URL
                      // leaves its day expanded instead of collapsing the whole list.
                      if (isOpen) setExpandedDay(dpr.report_date);
                      setOpenDprId(isOpen ? null : dpr.dpr_id);
                    }}
                    aria-expanded={isOpen}
                    aria-controls={`dpr-report-${dpr.dpr_id}`}
                    className="group grid cursor-pointer grid-cols-[1fr_28px] items-center gap-x-[12px] gap-y-[2px] rounded-[6px] pb-[4px] text-left text-[13px] text-gca-dark transition-colors duration-150 hover:text-gca-green focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gca-green md:grid-cols-[1fr_1fr_1fr_1fr_28px] md:items-center"
                  >
                    <span className={`truncate ${isOpen ? "font-semibold" : ""}`}>
                      {dpr.site_location}
                    </span>
                    {/* Phone: the chevron keeps the first row, the rest fold under the site
                        as one meta line instead of four squeezed columns. */}
                    {isOpen ? (
                      <ChevronUp className="size-[16px] justify-self-end text-gca-green md:order-last" />
                    ) : (
                      <ChevronDown className="size-[16px] justify-self-end text-gca-muted transition-colors duration-150 group-hover:text-gca-green md:order-last" />
                    )}
                    <span className="col-span-2 flex flex-wrap items-center gap-x-[8px] text-[12px] text-gca-muted md:contents md:text-[13px] md:text-inherit">
                      <span className="truncate">{authorName(dpr.author_id, team)}</span>
                      <span className="font-mono tabular-nums">
                        {dpr.submitted_at
                          ? new Date(dpr.submitted_at).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                      <span className={dpr.is_late ? "text-gca-warning" : "text-gca-green"}>
                        {dpr.status === "submitted" ? (dpr.is_late ? "Late" : "On time") : "Draft"}
                      </span>
                    </span>
                  </button>

                  {isOpen && (
                    <div id={`dpr-report-${dpr.dpr_id}`}>
                      <DprInlineReport projectId={projectId} dprId={dpr.dpr_id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
