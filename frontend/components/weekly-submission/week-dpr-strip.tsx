"use client";

import { useState } from "react";
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
}: {
  projectId: string;
  weekStart: string;
  team: TeamMember[];
}) {
  const { data: dprs = [] } = useWeekDprs(projectId, weekStart);
  const todayIso = new Date().toISOString().slice(0, 10);
  const [openDay, setOpenDay] = useState<string | null>(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const openDprs = openDay ? dprs.filter((d) => d.report_date === openDay) : [];

  return (
    <div className="flex w-full flex-col gap-[12px]">
      <div>
        <h3 className="text-[16px] font-semibold text-gca-dark">DPRs this week</h3>
        <p className="mt-[2px] text-[13px] text-gca-show">Red days have a missing DPR</p>
      </div>

      <div className="flex w-full items-center gap-[4px]">
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
              className={`flex items-center gap-[4px] rounded-[8px] px-[12px] py-[8px] text-[14px] font-medium disabled:cursor-not-allowed disabled:text-gca-muted ${
                isOpen ? "bg-gca-badge-bg text-gca-green" : isMissing ? "text-error-text" : "text-gca-dark"
              }`}
            >
              {DAY_LABELS[i]} {new Date(`${date}T00:00:00Z`).getUTCDate()}
            </button>
          );
        })}
      </div>

      {openDay && (
        <div className="flex flex-col gap-[8px] rounded-[10px] border border-gca-border p-[16px]">
          <div className="grid grid-cols-4 gap-[12px] text-[12px] font-medium text-gca-muted">
            <span>Site</span>
            <span>Engineer</span>
            <span>Submitted</span>
            <span>Status</span>
          </div>
          {openDprs.length === 0 ? (
            <p className="text-[13px] text-error-text">No DPR submitted for this day.</p>
          ) : (
            openDprs.map((dpr) => (
              <div key={dpr.dpr_id} className="grid grid-cols-4 gap-[12px] text-[13px] text-gca-dark">
                <span>{dpr.site_location}</span>
                <span>{authorName(dpr.author_id, team)}</span>
                <span className="font-mono">
                  {dpr.submitted_at ? new Date(dpr.submitted_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </span>
                <span className={dpr.is_late ? "text-gca-warning" : "text-gca-green"}>
                  {dpr.status === "submitted" ? (dpr.is_late ? "Late" : "On time") : "Draft"}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
