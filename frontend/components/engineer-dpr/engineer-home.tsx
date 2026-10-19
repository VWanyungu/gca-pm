"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useScheduleTasks } from "@/components/schedule/use-schedule-data";
import { addDays, mondayOf } from "@/components/weekly-submission/types";
import { useEngineerProjects, useEngineerWeekDprs } from "./use-dpr-wizard-data";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDue() {
  return "23:00";
}

export function EngineerHome() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: projects } = useEngineerProjects();
  const primaryProject = projects?.[0];

  const today = todayIso();
  const weekStart = mondayOf(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: weekDprs } = useEngineerWeekDprs(
    primaryProject?.project_id ?? "",
    weekStart,
    addDays(weekStart, 6),
  );
  const { data: tasks } = useScheduleTasks(primaryProject?.project_id ?? "");

  const todaysDpr = weekDprs?.find((d) => d.report_date.slice(0, 10) === today);
  const submittedDates = new Set(
    (weekDprs ?? []).filter((d) => d.status === "submitted").map((d) => d.report_date.slice(0, 10)),
  );

  // "Needs you": the most recent weekday before today with no DPR at all.
  const missingDay = weekDays
    .filter((d) => d < today)
    .reverse()
    .find((d) => !(weekDprs ?? []).some((dpr) => dpr.report_date.slice(0, 10) === d));

  const upcoming = (tasks ?? [])
    .filter((t) => !t.is_summary && !t.is_milestone && Number(t.pct_work_complete) < 100)
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .slice(0, 3);

  const greetingName = user?.firstName || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function startDpr(projectId: string) {
    router.push(`/engineer/dpr/new?projectId=${projectId}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex w-full items-center justify-between bg-white px-[16px] py-[10px]">
        <div className="flex flex-col gap-[2px]">
          <p className="text-[17px] font-semibold text-gca-dark">
            {greeting}, {greetingName}
          </p>
          <p className="text-[12px] text-gca-show">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
        {primaryProject && (
          <div className="flex flex-col gap-[14px] rounded-[12px] bg-white px-[16px] pt-[18px] pb-[14px]">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-semibold text-gca-dark">Today&apos;s DPR</p>
              {todaysDpr && (
                <p className="text-[12px] text-gca-warning">
                  {todaysDpr.status === "draft" ? "Draft" : "Submitted"}
                </p>
              )}
            </div>
            <div className="flex items-baseline gap-[8px]">
              <p className="text-[30px] font-semibold text-gca-badge-text">
                {todaysDpr?.status === "submitted" ? "Done" : "Due"}
              </p>
              <p className="text-[13px] text-gca-show">
                {todaysDpr?.status === "submitted" ? "submitted today" : `due ${formatDue()}`}
              </p>
            </div>
            <div className="flex flex-col gap-[6px]">
              <p className="text-[14px] font-medium text-gca-dark">{primaryProject.name}</p>
            </div>
            {todaysDpr ? (
              <button
                onClick={() => router.push(`/engineer/dpr/new?projectId=${primaryProject.project_id}`)}
                className="flex w-full items-center justify-center rounded-[10px] bg-gca-green py-[14px]"
              >
                <p className="text-[15px] font-semibold text-white">
                  {todaysDpr.status === "draft" ? "Resume draft" : "View today's DPR"}
                </p>
              </button>
            ) : (
              <button
                onClick={() => startDpr(primaryProject.project_id)}
                className="flex w-full items-center justify-center rounded-[10px] bg-gca-green py-[14px]"
              >
                <p className="text-[15px] font-semibold text-white">Start today&apos;s DPR</p>
              </button>
            )}
            {projects && projects.length > 1 && (
              <button
                onClick={() => router.push("/engineer/dpr/new")}
                className="flex w-full items-center justify-center py-[4px]"
              >
                <p className="text-[14px] font-medium text-gca-green">Start a DPR for another site</p>
              </button>
            )}
          </div>
        )}

        {missingDay && (
          <>
            <div className="flex items-center justify-between px-[4px]">
              <p className="text-[13px] font-semibold text-gca-show">Needs you</p>
            </div>
            <div className="flex flex-col rounded-[12px] bg-white px-[16px]">
              <Link
                href={primaryProject ? `/engineer/dpr/new?projectId=${primaryProject.project_id}` : "/engineer"}
                className="flex items-center justify-between py-[12px]"
              >
                <div className="flex items-center gap-[12px]">
                  <div className="flex size-[36px] items-center justify-center rounded-full bg-error-bg">
                    <span className="text-[14px] text-error-text">!</span>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    <p className="text-[14px] font-medium text-gca-dark">
                      {new Date(`${missingDay}T00:00:00Z`).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "UTC",
                      })}{" "}
                      DPR is missing
                    </p>
                    <p className="text-[12px] text-gca-muted">Tap to create it</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gca-muted" />
              </Link>
            </div>
          </>
        )}

        <div className="flex items-center justify-between px-[4px] text-[13px]">
          <p className="font-semibold text-gca-show">This week</p>
          <p className="text-gca-muted">Red days have a missing DPR</p>
        </div>
        <div className="flex flex-col gap-[0px] rounded-[12px] bg-white px-[8px] pt-[12px] pb-[10px]">
          <div className="flex items-center justify-between px-[4px]">
            {weekDays.map((day, i) => {
              const isToday = day === today;
              const isFuture = day > today;
              const submitted = submittedDates.has(day);
              const color = isFuture ? "#9aa89e" : submitted ? "#18301f" : "#b42318";
              return (
                <div key={day} className="flex w-[44px] flex-col items-center gap-[4px]">
                  <p className="text-[12px] font-medium" style={{ color: isFuture ? "#9aa89e" : "#627469" }}>
                    {DAY_LETTERS[i]}
                  </p>
                  <p className="text-[17px] font-medium" style={{ color }}>
                    {Number(day.slice(8, 10))}
                  </p>
                  <div
                    className="h-[2px] w-[16px] rounded-[1px]"
                    style={{ background: isToday ? "#2e7d45" : "transparent" }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {upcoming.length > 0 && (
          <>
            <div className="flex items-center justify-between px-[4px] text-[13px]">
              <p className="font-semibold text-gca-show">Coming up</p>
              {primaryProject && (
                <Link href={`/projects/${primaryProject.project_id}/schedule`} className="font-medium text-gca-green">
                  Open schedule
                </Link>
              )}
            </div>
            <div className="flex flex-col rounded-[12px] bg-white px-[16px]">
              {upcoming.map((task, i) => (
                <div
                  key={task.task_id}
                  className={`flex items-center justify-between py-[8px] ${i > 0 ? "border-t border-gca-border" : ""}`}
                >
                  <div className={`flex flex-col gap-[2px] ${task.is_overdue ? "text-error-text" : ""}`}>
                    <p className="text-[14px] font-medium" style={{ color: task.is_overdue ? undefined : "#18301f" }}>
                      {task.task_name}
                    </p>
                    <p className="text-[12px]" style={{ color: task.is_overdue ? undefined : "#627469" }}>
                      {task.is_overdue
                        ? `Overdue since ${new Date(task.expected_finish).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : `Starts ${new Date(task.start).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {primaryProject && (
          <Link
            href={`/projects/${primaryProject.project_id}/change-requests`}
            className="flex items-center justify-center gap-[6px] pt-[4px]"
          >
            <p className="text-[14px] font-medium text-gca-green">Raise a change request</p>
            <ChevronRight className="h-3 w-3 text-gca-green" />
          </Link>
        )}
      </div>
    </div>
  );
}
