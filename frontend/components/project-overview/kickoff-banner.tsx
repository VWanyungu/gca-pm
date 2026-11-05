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
    <div className="mx-auto w-full max-w-[1200px] px-[20px] md:px-[40px] pt-[5px] md:pt-[15px]">
      <div className="rounded-lg mx-auto flex w-full items-center justify-between gap-[12px] bg-gca-warning-bg px-[20px] py-[10px] md:px-[20px]">
      <p className="text-[13px] text-gca-warning">
        DPR, weekly reports, risks, change requests, milestones and schedule upload stay
        locked until <Link
          href={`/projects/${projectId}/stages/0`}
          className="underline font-semibold"
        >
          project kickoff
        </Link> is complete.
      </p>
      <div className="flex shrink-0 items-center gap-[16px]">
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
    </div>
  );
}
