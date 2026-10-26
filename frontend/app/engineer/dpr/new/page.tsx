"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useEngineerProjects, findDprForDate } from "@/components/engineer-dpr/use-dpr-wizard-data";
import { todayInTimezone } from "@/components/engineer-dpr/types";
import { DprNewWizard } from "@/components/engineer-dpr/dpr-new-wizard";
import { DprEditWizard } from "@/components/engineer-dpr/dpr-edit-wizard";

export default function NewDprPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const reportDate = searchParams.get("reportDate") ?? undefined;
  const amendmentMode = searchParams.get("amendment") === "true";
  const { data: projects, isLoading } = useEngineerProjects();

  // "Request amendment" needs a specific DPR id, which this route is only ever given a date
  // for — resolve the submitted DPR for that date once, then hand off to the edit wizard.
  const { data: existingForAmendment, isLoading: resolvingAmendment } = useQuery({
    queryKey: ["dpr-for-date", projectId, reportDate ?? todayInTimezone(undefined)],
    queryFn: () => findDprForDate(projectId!, reportDate ?? todayInTimezone(undefined)),
    enabled: !!projectId && amendmentMode,
  });

  if (projectId) {
    if (amendmentMode) {
      if (resolvingAmendment) {
        return (
          <div className="flex flex-1 items-center justify-center p-[40px]">
            <LoaderCircle className="size-[24px] animate-spin text-gca-muted" />
          </div>
        );
      }
      if (!existingForAmendment) {
        return (
          <div className="flex flex-1 items-center justify-center p-[40px] text-center">
            <p className="text-[14px] text-gca-muted">No submitted DPR found for this date.</p>
          </div>
        );
      }
      return (
        <DprEditWizard
          key={existingForAmendment.dpr_id}
          projectId={projectId}
          dprId={existingForAmendment.dpr_id}
          amendmentMode
        />
      );
    }

    return (
      <DprNewWizard key={`${projectId}:${reportDate ?? "today"}`} projectId={projectId} reportDate={reportDate} />
    );
  }

  if (isLoading) return null;

  if (projects && projects.length === 1) {
    router.replace(`/engineer/dpr/new?projectId=${projects[0].project_id}`);
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-[12px] p-[16px]">
      <p className="text-[17px] font-semibold text-gca-dark">Choose a site</p>
      <div className="flex flex-col rounded-[12px] bg-gca-surface px-[16px]">
        {(projects ?? []).map((p, i) => (
          <Link
            key={p.project_id}
            href={`/engineer/dpr/new?projectId=${p.project_id}`}
            className={`flex items-center justify-between py-[14px] ${i > 0 ? "border-t border-gca-border" : ""}`}
          >
            <p className="text-[15px] text-gca-dark">{p.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
