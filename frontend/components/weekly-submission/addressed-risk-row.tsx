"use client";

import { X } from "lucide-react";
import { useRisk } from "@/components/risks/use-risks-data";
import { ratingFromScore } from "@/components/risks/types";
import type { TeamMember } from "@/components/project-overview/types";
import type { SubmissionAddressedRisk } from "./types";

function ownerName(userId: string | undefined, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

export function AddressedRiskRow({
  index,
  projectId,
  addressedRisk,
  isMainTopRisk,
  team,
  onRemove,
}: {
  index: number;
  projectId: string;
  addressedRisk: SubmissionAddressedRisk;
  isMainTopRisk: boolean;
  team: TeamMember[];
  onRemove?: () => void;
}) {
  const { data: risk } = useRisk(projectId, addressedRisk.risk_id);
  const rating = risk ? ratingFromScore(risk.score) : null;

  return (
    <div className="flex w-full items-start justify-between gap-[16px] border-b border-gca-border py-[16px] last:border-b-0">
      <div className="flex gap-[12px]">
        <span className="pt-[1px] text-[14px] text-gca-muted">{index}</span>
        <div className="flex flex-col gap-[4px]">
          <div className="flex items-center gap-[10px]">
            <p className="text-[14px] font-medium text-gca-dark">
              {addressedRisk.risk_title ?? risk?.title ?? "Risk"}
            </p>
            {isMainTopRisk && (
              <span className="rounded-[6px] bg-gca-badge-bg px-[8px] py-[2px] text-[12px] font-medium text-gca-green">
                Main top risk
              </span>
            )}
          </div>
          {rating && <p className={`text-[13px] font-medium ${rating.className}`}>{rating.label}</p>}
          <p className="text-[13px] text-gca-show">{risk?.mitigation || "—"}</p>
        </div>
      </div>
      <div className="flex items-center gap-[16px]">
        <span className="text-[13px] text-gca-muted">{ownerName(risk?.owner_id, team)}</span>
        {onRemove && (
          <button onClick={onRemove} className="cursor-pointer text-gca-muted hover:text-error-text">
            <X className="size-[16px]" />
          </button>
        )}
      </div>
    </div>
  );
}
