"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useStageActivities } from "./use-project-data";
import { useProjectSidebarData } from "./project-sidebar-context";

/** Shown on every project page while Kickoff isn't complete — DPR, weekly, risks, change
 *  requests, milestones and schedule upload stay locked until it is (AC-STG-11). */
export function KickoffBanner() {
  const { projectId, kickoffComplete } = useProjectSidebarData();
  const { data: activities = [] } = useStageActivities(projectId);
  const [dismissed, setDismissed] = useState(false);

  if (kickoffComplete || dismissed) return null;

  const kickoffActivities = activities.filter((a) => a.stage_no === 0);
  const remaining = kickoffActivities.filter((a) => a.status !== "done").length;
  if (kickoffActivities.length === 0) return null;

  return (
    <div className="flex w-full items-center justify-between gap-[12px] bg-gca-warning-bg px-[20px] py-[10px] md:px-[40px]">
      <p className="text-[13px] text-gca-warning">
        {remaining} required kickoff {remaining === 1 ? "activity" : "activities"} left.
        DPR, weekly reports, risks, change requests, milestones and schedule upload stay
        locked until Kickoff is complete.
      </p>
      <div className="flex shrink-0 items-center gap-[16px]">
        <Link
          href={`/projects/${projectId}/stages/0`}
          className="flex items-center gap-[6px] text-[13px] font-semibold text-gca-warning hover:underline"
        >
          Jump to Kickoff
          <ArrowRight className="size-[13px]" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-gca-warning/70 hover:text-gca-warning"
        >
          <X className="size-[16px]" />
        </button>
      </div>
    </div>
  );
}
