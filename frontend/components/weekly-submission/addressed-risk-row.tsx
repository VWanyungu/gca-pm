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
  onMarkAsTopRisk,
  onRemove,
}: {
  index: number;
  projectId: string;
  addressedRisk: SubmissionAddressedRisk;
  isMainTopRisk: boolean;
  team: TeamMember[];
  onMarkAsTopRisk?: (title: string, mitigation: string | null) => void;
  onRemove?: () => void;
}) {
  const { data: risk } = useRisk(projectId, addressedRisk.risk_id);
  const rating = risk ? ratingFromScore(risk.score) : null;

  return (
    <div className="flex w-full items-start justify-between gap-[8px] border-b border-gca-border py-[14px] last:border-b-0">
      <div className="flex min-w-0 gap-[12px]">
        <span className="pt-[1px] w-[14px] shrink-0 font-mono text-[13px] font-semibold text-gca-muted">
          {index}
        </span>
        <div className="flex min-w-0 flex-col gap-[4px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            <p className="text-[14px] font-medium text-gca-dark md:w-[330px]">
              {addressedRisk.risk_title ?? risk?.title ?? "Risk"}
            </p>
            {isMainTopRisk && (
              <span className="rounded-[999px] bg-gca-badge-bg px-[8px] py-[3px] text-[11px] font-semibold text-gca-green">
                Main top risk
              </span>
            )}
          </div>
          {rating && (
            <p className={`text-[12px] font-semibold ${rating.className}`}>{rating.label}</p>
          )}
          {/* The mitigation and its owner share a line only once there is width for both. */}
          <div className="flex flex-col gap-[2px] text-[13px] md:flex-row md:items-center md:gap-[16px]">
            <p className="text-gca-dark md:w-[360px]">{risk?.mitigation || "—"}</p>
            <p className="text-gca-show md:whitespace-nowrap">{ownerName(risk?.owner_id, team)}</p>
          </div>
          {onMarkAsTopRisk && risk && (
            <button
              onClick={() => onMarkAsTopRisk(risk.title, risk.mitigation ?? null)}
              className="w-fit cursor-pointer text-[12px] font-medium text-gca-green"
            >
              {isMainTopRisk ? "Unmark as top risk" : "Mark as top risk"}
            </button>
          )}
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
