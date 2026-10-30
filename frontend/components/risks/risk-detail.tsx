"use client";

import { useState } from "react";
import { ArrowLeft, LoaderCircle, Pencil } from "lucide-react";
import { api } from "@/lib/api-client";
import { useRisk, useRiskCategories, useRisksInvalidate } from "./use-risks-data";
import { formatShortDate, ratingFromScore, statusInfo } from "./types";
import type { TeamMember } from "@/components/project-overview/types";

function personName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

interface RiskDetailProps {
  projectId: string;
  riskId: string;
  team: TeamMember[];
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function RiskDetail({
  projectId,
  riskId,
  team,
  canManage,
  onBack,
  onEdit,
}: RiskDetailProps) {
  const { data: risk } = useRisk(projectId, riskId);
  const { data: categories = [] } = useRiskCategories(projectId);
  const invalidate = useRisksInvalidate(projectId);

  const [editingMitigation, setEditingMitigation] = useState(false);
  const [mitigationDraft, setMitigationDraft] = useState("");
  const [saving, setSaving] = useState(false);

  if (!risk) return null;

  const rating = ratingFromScore(risk.score);
  const status = statusInfo(risk);
  const categoryName = categories.find((c) => c.risk_category_id === risk.category_id)?.name ?? "—";

  async function saveMitigation() {
    if (!risk) return;
    setSaving(true);
    await api.patch(`/projects/${projectId}/risks/${risk.risk_id}`, {
      mitigation: mitigationDraft.trim() || null,
    });
    setSaving(false);
    setEditingMitigation(false);
    invalidate();
  }

  return (
    <div className="flex w-full flex-col gap-[20px] lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-[16px] rounded-[12px] bg-gca-surface p-[24px]">
        <button
          onClick={onBack}
          className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
        >
          <ArrowLeft className="size-[18]" />
          Risks
        </button>

        <div className="flex items-start justify-between">
          <p className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">{risk.title}</p>
          {canManage && (
            <button
              onClick={onEdit}
              className="cursor-pointer flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
            >
              <Pencil className="size-[14px]" />
              Edit
            </button>
          )}
        </div>

        {risk.description && <p className="text-[14px] text-gca-dark">{risk.description}</p>}

        <div className="flex items-center justify-between border-t border-gca-border pt-[16px]">
          <p className="text-[14px] font-semibold text-gca-dark">Mitigation</p>
          {canManage && !editingMitigation && (
            <button
              onClick={() => {
                setMitigationDraft(risk.mitigation ?? "");
                setEditingMitigation(true);
              }}
              className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
            >
              <Pencil className="size-[14px]" />
              Edit
            </button>
          )}
        </div>

        {editingMitigation ? (
          <div className="flex flex-col gap-[10px]">
            <textarea
              value={mitigationDraft}
              onChange={(e) => setMitigationDraft(e.target.value)}
              rows={3}
              autoFocus
              className="rounded-[8px] border border-gca-green px-[13px] py-[10px] text-[14px] outline-none"
            />
            <div className="flex justify-end gap-[12px]">
              <button
                onClick={() => setEditingMitigation(false)}
                className="cursor-pointer text-[13px] font-medium text-gca-show"
              >
                Cancel
              </button>
              <button
                onClick={saveMitigation}
                disabled={saving}
                className="relative flex cursor-pointer items-center justify-center gap-[6px] rounded-[8px] bg-gca-green px-[14px] py-[8px] text-[13px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
              >
                <span className={saving ? "invisible" : undefined}>Save</span>
                {saving && (
                  <LoaderCircle
                    className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                    aria-label="Saving"
                  />
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[14px] text-gca-dark">
            {risk.mitigation || "No mitigation recorded yet."}
          </p>
        )}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-[12px] rounded-[12px] bg-gca-page-bg p-[20px] lg:w-[320px]">
        <p className="text-[14px] font-semibold text-gca-dark">Details</p>
        <div className="flex flex-col gap-[10px] text-[13px]">
          <Row label="Status" value={status.label} valueClassName={status.className} />
          <Row label="Rating" value={rating.label} valueClassName={rating.className} />
          <Row label="Category" value={categoryName} />
          <Row label="Owner" value={personName(risk.owner_id, team)} />
          <Row label="Raised" value={formatShortDate(risk.opened_at)} />
          {risk.review_by && <Row label="Review by" value={formatShortDate(risk.review_by)} />}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-[12px]">
      <span className="text-gca-show">{label}</span>
      <span className={`font-semibold ${valueClassName ?? "text-gca-dark"}`}>{value}</span>
    </div>
  );
}
