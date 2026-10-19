"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import type { TeamMember } from "@/components/project-overview/types";
import { useWeekDprs } from "./use-weekly-submission-data";
import { addDays } from "./types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function authorName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
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
  const todayIso = new Date().toISOString().slice(0, 10);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const openDprs = openDay ? dprs.filter((d) => d.report_date === openDay) : [];

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div>
        <h3 className="text-[16px] font-semibold text-gca-dark">DPRs this week</h3>
        {/* <p className="mt-[2px] text-[13px] text-gca-show">Red days have a missing DPR</p> */}
      </div>

      <div className="flex w-full items-center justify-between gap-[24px]">
        <button
          onClick={onPrevWeek}
          className="p-[8px] rounded-lg border border-gca-border cursor-pointer text-gca-muted hover:text-gca-dark disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!onPrevWeek}
        >
          <ChevronLeft className="size-[16px]" />
        </button>

        <div className="flex w-full items-center justify-between gap-[16px] flex-1">
          {days.map((date, i) => {
            const isFuture = date > todayIso;
            const hasDpr = dprs.some((d) => d.report_date === date);
            const isMissing = !isFuture && !hasDpr;
            const isOpen = openDay === date;
            return (
              <button
                key={date}
                onClick={() => !isFuture && setOpenDay(isOpen ? null : date)}
                disabled={isFuture}
                className={`py-[8px] px-[12px] flex cursor-pointer items-center gap-[4px] text-[15px] font-medium disabled:cursor-not-allowed disabled:text-[#9aa89e] ${isOpen && "bg-gca-badge-bg rounded-lg"} ${!isMissing || isOpen ? "" : "text-error-text"}`}
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
          className="p-[8px] rounded-lg border border-gca-border cursor-pointer text-gca-muted hover:text-gca-dark disabled:cursor-not-allowed disabled:opacity-40"
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

          <div className="grid grid-cols-5 gap-[12px] text-[12px] font-medium text-gca-muted border-b border-gca-border pb-[4px]">
            <span>Site</span>
            <span>Engineer</span>
            <span>Submitted</span>
            <span>Status</span>
            <span></span>
          </div>
          {openDprs.length === 0 ? (
            <p className="text-[13px] text-error-text text-center py-[12px]">
              No DPR submitted for this day.
            </p>
          ) : (
            openDprs.map((dpr) => (
              <div
                key={dpr.dpr_id}
                className="grid grid-cols-5 gap-[12px] text-[13px] text-gca-dark border-b border-gca-border pb-[4px] items-center"
              >
                <span>{dpr.site_location}</span>
                <span>{authorName(dpr.author_id, team)}</span>
                <span className="font-mono">
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
                <Link
                  href={`/projects/${projectId}/dpr/${dpr.dpr_id}`}
                  className="font-medium text-gca-green justify-self-end"
                >
                  View DPR
                </Link>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
