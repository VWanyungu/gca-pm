"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useStageRisks } from "./use-stage-view-data";
import type { StageRisk } from "@/components/project-overview/types";

function severity(risk: StageRisk): { label: string; className: string } {
  if (risk.impact >= 4) return { label: "High", className: "text-error-text" };
  if (risk.impact === 3) return { label: "Medium", className: "text-gca-warning" };
  return { label: "Low", className: "text-gca-muted" };
}

function sourceLabel(risk: StageRisk) {
  const kind = risk.kind === "issue" ? "Issue" : "Risk";
  return risk.source === "overdue_task" ? `${kind} · From schedule` : `${kind} · Manual`;
}

export function StageRisksCard({ projectId, stageNo }: { projectId: string; stageNo: number }) {
  const { data: risks = [] } = useStageRisks(projectId, stageNo);

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] bg-gca-page-bg p-[24px]">
      <div className="flex items-center justify-between">
        <p className="text-[16px] font-semibold text-gca-dark">Stage risks & changes</p>
        <Link
          href={`/projects/${projectId}/risks`}
          className="flex gap-[6px] items-center text-[13px] font-medium text-gca-green"
        >
          View all <ArrowRight className="size-[18]" />
        </Link>
      </div>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center gap-[12px] py-[16px] text-center">
          <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-surface">
            <ShieldCheck className="size-[18px] text-gca-green" />
          </span>
          <p className="text-[14px] font-semibold text-gca-dark">Nothing raised for this stage</p>
          <p className="text-[13px] text-gca-show">
            Risks and issues tagged to this stage show here.
          </p>
          <Link
            href={`/projects/${projectId}/risks`}
            className="text-[13px] font-medium text-gca-green"
          >
            Raise a risk
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {risks.map((risk, i) => {
            const sev = severity(risk);
            return (
              <div
                key={risk.risk_id}
                className={`flex items-start justify-between py-[10px] ${i > 0 ? "border-t border-gca-border" : ""}`}
              >
                <div className="flex flex-col gap-[2px]">
                  <p className="w-[200px] text-[13px] font-medium text-gca-dark">{risk.title}</p>
                  <p className="text-[12px] text-gca-muted">{sourceLabel(risk)}</p>
                </div>
                <span className={`text-[12px] font-semibold ${sev.className}`}>{sev.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
