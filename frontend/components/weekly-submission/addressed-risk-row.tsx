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
    <div className="flex w-full items-start justify-between border-b border-gca-border py-[14px] last:border-b-0">
      <div className="flex gap-[12px]">
        <span className="pt-[1px] w-[14px] font-mono text-[13px] font-semibold text-gca-muted">{index}</span>
        <div className="flex flex-col gap-[4px]">
          <div className="flex items-center gap-[8px]">
            <p className="w-[330px] text-[14px] font-medium text-gca-dark">
              {addressedRisk.risk_title ?? risk?.title ?? "Risk"}
            </p>
            {isMainTopRisk && (
              <span className="rounded-[999px] bg-gca-badge-bg px-[8px] py-[3px] text-[11px] font-semibold text-gca-green">
                Main top risk
              </span>
            )}
          </div>
          {rating && <p className={`text-[12px] font-semibold ${rating.className}`}>{rating.label}</p>}
          <div className="flex items-center gap-[16px] text-[13px]">
            <p className="w-[360px] text-gca-dark">{risk?.mitigation || "—"}</p>
            <p className="whitespace-nowrap text-gca-show">{ownerName(risk?.owner_id, team)}</p>
          </div>
        </div>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="cursor-pointer text-gca-muted hover:text-error-text">
          <X className="size-[16px]" />
        </button>
      )}
    </div>
  );
}
