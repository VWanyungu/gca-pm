"use client";

import Link from "next/link";
import { addDays, mondayOf } from "@/components/weekly-submission/types";
import { useEngineerProjects, useEngineerWeekDprs } from "@/components/engineer-dpr/use-dpr-wizard-data";

export default function MyDprsPage() {
  const { data: projects } = useEngineerProjects();
  const primaryProject = projects?.[0];
  const weekStart = mondayOf(new Date());
  const { data: dprs } = useEngineerWeekDprs(
    primaryProject?.project_id ?? "",
    addDays(weekStart, -28),
    addDays(weekStart, 6),
  );

  return (
    <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
      <p className="text-[17px] font-semibold text-gca-dark">My DPRs</p>
      {!primaryProject && <p className="text-[14px] text-gca-muted">No project assigned.</p>}
      <div className="flex flex-col rounded-[12px] bg-gca-surface px-[16px]">
        {(dprs ?? []).map((dpr, i) => (
          <Link
            key={dpr.dpr_id}
            href={`/projects/${primaryProject?.project_id}/dpr/${dpr.dpr_id}`}
            className={`flex items-center justify-between py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
          >
            <div className="flex flex-col gap-[2px]">
              <p className="text-[14px] font-medium text-gca-dark">{dpr.site_location}</p>
              <p className="text-[12px] text-gca-muted">
                {new Date(`${dpr.report_date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  timeZone: "UTC",
                })}
              </p>
            </div>
            <p className="text-[12px] text-gca-show">{dpr.status === "draft" ? "Draft" : (dpr.dpr_ref ?? "Submitted")}</p>
          </Link>
        ))}
        {dprs && dprs.length === 0 && <p className="py-[12px] text-[14px] text-gca-muted">No DPRs in the last 4 weeks.</p>}
      </div>
    </div>
  );
}
