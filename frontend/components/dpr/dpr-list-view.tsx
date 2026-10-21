"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_CREATE_DPR } from "@/lib/access-control";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useSidebarCounts,
} from "@/components/project-overview/use-project-data";
import { useDprs } from "@/components/weekly-submission/use-weekly-submission-data";
import type { DprSummary } from "@/components/weekly-submission/types";
import { DprWizard } from "@/components/engineer-dpr/dpr-wizard";

type SubView = { mode: "list" } | { mode: "new" };

function formatDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusInfo(dpr: DprSummary): { label: string; className: string } {
  if (dpr.status === "draft") return { label: "Draft", className: "text-gca-muted" };
  if (dpr.is_late) return { label: "Submitted late", className: "text-gca-warning" };
  return { label: "Submitted", className: "text-gca-green" };
}

export function DprListView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });
  const { data } = useDprs({ projectId, limit: 50 });

  const canCreate = canAccess(user?.role, CAN_CREATE_DPR, { projectId });
  const dprs = data?.dprs ?? [];

  if (!project) return null;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="dpr" />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          {subView.mode === "new" ? (
            <DprWizard
              projectId={projectId}
              onClose={() => setSubView({ mode: "list" })}
              onSubmitted={(dprId) => router.push(`/projects/${projectId}/dpr/${dprId}`)}
            />
          ) : (
            <>
              <div className="flex w-full items-center justify-between">
                <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
                  Daily progress reports
                </h1>
                {canCreate && (
                  <button
                    onClick={() => setSubView({ mode: "new" })}
                    className="flex cursor-pointer items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
                  >
                    <Plus className="size-[14px]" />
                    New DPR
                  </button>
                )}
              </div>

              {dprs.length === 0 ? (
                <div className="flex flex-col items-center gap-[16px] py-[56px]">
                  <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
                    <ClipboardList className="size-[18px] text-gca-green" />
                  </span>
                  <div className="flex flex-col items-center gap-[4px] text-center">
                    <p className="text-[14px] font-semibold text-gca-dark">No DPRs yet</p>
                    <p className="max-w-[420px] text-[13px] text-gca-show">
                      Daily progress reports submitted for this project will show up here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex w-full flex-col">
                  <div className="flex w-full items-center gap-[10px] border-b border-gca-border py-[8px] text-[12px] font-medium text-gca-muted">
                    <p className="w-[20%]">Reference</p>
                    <p className="w-[28%]">Date</p>
                    <p className="w-[22%]">Site</p>
                    <p className="w-[15%]">Status</p>
                  </div>
                  {dprs.map((dpr, i) => {
                    const status = statusInfo(dpr);
                    return (
                      <button
                        key={dpr.dpr_id}
                        onClick={() => router.push(`/projects/${projectId}/dpr/${dpr.dpr_id}`)}
                        className={`flex w-full cursor-pointer items-center gap-[10px] py-[12px] text-left ${
                          i > 0 ? "border-t border-gca-border" : ""
                        }`}
                      >
                        <p className="w-[20%] truncate text-[13px] font-medium text-gca-dark">
                          {dpr.dpr_ref ?? "—"}
                        </p>
                        <p className="w-[28%] text-[13px] text-gca-dark">{formatDate(dpr.report_date)}</p>
                        <p className="w-[22%] truncate text-[13px] text-gca-dark">{dpr.site_location}</p>
                        <p className={`w-[15%] text-[13px] font-semibold ${status.className}`}>
                          {status.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
