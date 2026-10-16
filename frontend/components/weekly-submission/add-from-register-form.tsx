"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRisks, useRiskCategories } from "@/components/risks/use-risks-data";
import { ratingFromScore } from "@/components/risks/types";
import type { TeamMember } from "@/components/project-overview/types";
import { addAddressedRisk, useWeeklySubmissionInvalidate } from "./use-weekly-submission-data";
import type { SubmissionAddressedRisk } from "./types";

type SeverityFilter = "all" | "High" | "Medium";

function ownerName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name[0]}. ${member.last_name}` : "—";
}

export function AddFromRegisterForm({
  projectId,
  submissionId,
  alreadyAddressed,
  team,
  onDone,
  onCancel,
}: {
  projectId: string;
  submissionId: string;
  alreadyAddressed: SubmissionAddressedRisk[];
  team: TeamMember[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data } = useRisks({ projectId, status: "open", page: 1, limit: 100 });
  const { data: categories = [] } = useRiskCategories(projectId);
  const invalidate = useWeeklySubmissionInvalidate(projectId);

  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressedIds = new Set(alreadyAddressed.map((r) => r.risk_id));
  const withRating = (data?.riskIssues ?? []).map((risk) => ({
    risk,
    rating: ratingFromScore(risk.score),
  }));

  const counts = {
    all: withRating.length,
    High: withRating.filter((r) => r.rating.label === "High").length,
    Medium: withRating.filter((r) => r.rating.label === "Medium").length,
  };

  const filtered = withRating.filter(
    ({ risk, rating }) =>
      (severity === "all" || rating.label === severity) &&
      risk.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(riskId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(riskId)) next.delete(riskId);
      else next.add(riskId);
      return next;
    });
  }

  function categoryName(categoryId: number) {
    return categories.find((c) => c.risk_category_id === categoryId)?.name ?? "—";
  }

  async function submit() {
    if (selected.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      for (const riskId of selected) {
        await addAddressedRisk(projectId, submissionId, { risk_id: riskId, method: "commentary" });
      }
      invalidate();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the selected risks");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[16px] rounded-[12px] bg-white">
      <div className="flex items-center gap-[10px] rounded-[8px] border border-gca-border bg-white px-[12px] py-[9px]">
        <Search className="size-[14px] shrink-0 text-gca-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search open risks"
          className="w-full text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
        />
      </div>

      <div className="flex w-fit gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
        {(["all", "High", "Medium"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setSeverity(key)}
            className={`cursor-pointer rounded-[6px] px-[10px] py-[5px] text-[13px] ${
              severity === key ? "bg-white font-medium text-gca-dark" : "font-normal text-gca-show"
            }`}
          >
            {key === "all" ? `All ${counts.all}` : `${key} ${counts[key]}`}
          </button>
        ))}
      </div>

      <div className="flex flex-col">
        {filtered.length === 0 ? (
          <p className="py-[12px] text-[13px] text-gca-muted text-center py-[12px]">
            No open risks match.
          </p>
        ) : (
          filtered.map(({ risk, rating }) => {
            const already = addressedIds.has(risk.risk_id);
            return (
              <label
                key={risk.risk_id}
                className={`flex items-start justify-between gap-[12px] border-t border-gca-border py-[12px] first:border-t-0 ${
                  already ? "cursor-default opacity-55" : "cursor-pointer"
                }`}
              >
                <div className="flex items-start gap-[12px]">
                  {already ? (
                    <span className="size-[18px] shrink-0" />
                  ) : (
                    <input
                      type="checkbox"
                      checked={selected.has(risk.risk_id)}
                      onChange={() => toggle(risk.risk_id)}
                      className="mt-[2px] size-[18px] shrink-0 cursor-pointer rounded-[4px] border-[1.5px] border-[#c9d3cb] accent-gca-green"
                    />
                  )}
                  <div className="flex flex-col gap-[3px]">
                    <p className="text-[14px] font-medium text-gca-dark">{risk.title}</p>
                    <div className="flex gap-[6px] text-[12px]">
                      <span className={`font-semibold ${rating.className}`}>{rating.label}</span>
                      <span className="text-gca-muted">
                        · {categoryName(risk.category_id)} · {ownerName(risk.owner_id, team)}
                      </span>
                    </div>
                  </div>
                </div>
                {already && (
                  <span className="text-[12px] font-medium text-gca-muted">Already added</span>
                )}
              </label>
            );
          })
        )}
      </div>

      {error && <p className="text-[13px] text-error-text">{error}</p>}

      <div className="flex items-center justify-between border-t border-gca-border pt-[16px]">
        <p className="text-[13px] text-gca-show">{selected.size} selected</p>
        <div className="flex items-center gap-[16px]">
          <button
            onClick={onCancel}
            className="cursor-pointer text-[14px] font-medium text-gca-show"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || selected.size === 0}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {selected.size === 0
              ? "Add risk"
              : `Add ${selected.size} risk${selected.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
