"use client";

import { useState } from "react";
import Dropdown from "@/components/Dropdown";
import { useRisks } from "@/components/risks/use-risks-data";
import { addAddressedRisk, updateWeeklySubmission, useWeeklySubmissionInvalidate } from "./use-weekly-submission-data";
import type { AddressedRiskMethod, SubmissionAddressedRisk } from "./types";

const METHOD_OPTIONS: { id: AddressedRiskMethod; label: string; hint: string }[] = [
  { id: "top_risk", label: "Set as top risk", hint: "Becomes this week's main top risk and action" },
  { id: "commentary", label: "Reference in commentary", hint: "Listed as addressed, no change to the top risk" },
  { id: "dismissed", label: "Dismiss", hint: "Closes the risk as no longer relevant" },
];

export function AddFromRegisterForm({
  projectId,
  submissionId,
  alreadyAddressed,
  onDone,
  onCancel,
}: {
  projectId: string;
  submissionId: string;
  alreadyAddressed: SubmissionAddressedRisk[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data } = useRisks({ projectId, status: "open", page: 1, limit: 100 });
  const invalidate = useWeeklySubmissionInvalidate(projectId);

  const [riskId, setRiskId] = useState("");
  const [method, setMethod] = useState<AddressedRiskMethod>("commentary");
  const [dismissalReason, setDismissalReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressedIds = new Set(alreadyAddressed.map((r) => r.risk_id));
  const riskOptions = (data?.riskIssues ?? [])
    .filter((r) => !addressedIds.has(r.risk_id))
    .map((r) => ({ id: r.risk_id, name: r.title }));

  async function submit() {
    if (!riskId) {
      setError("Choose a risk");
      return;
    }
    if (method === "dismissed" && !dismissalReason.trim()) {
      setError("A reason is required to dismiss a risk");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addAddressedRisk(projectId, submissionId, {
        risk_id: riskId,
        method,
        dismissal_reason: method === "dismissed" ? dismissalReason.trim() : null,
      });
      if (method === "top_risk") {
        const risk = data?.riskIssues.find((r) => r.risk_id === riskId);
        await updateWeeklySubmission(projectId, submissionId, {
          top_risk_id: riskId,
          top_risk_text: risk?.title ?? null,
          top_action: risk?.mitigation ?? null,
        });
      }
      invalidate();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add the risk");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[16px] rounded-[10px] border border-gca-border bg-gca-page-bg p-[16px]">
      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] font-medium text-gca-dark">Risk</label>
        <Dropdown
          id="add-from-register-risk"
          title="Choose an open risk"
          data={riskOptions}
          selectedId={riskId}
          style="h-[40px] w-full rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px]"
          onSelect={(id) => setRiskId(id)}
        />
      </div>

      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] font-medium text-gca-dark">How it&apos;s addressed</label>
        <div className="flex gap-[8px]">
          {METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMethod(opt.id)}
              title={opt.hint}
              className={`flex-1 cursor-pointer rounded-[8px] border px-[12px] py-[8px] text-[13px] font-medium ${
                method === opt.id
                  ? "border-gca-green bg-gca-badge-bg text-gca-green"
                  : "border-gca-border bg-white text-gca-show"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {method === "dismissed" && (
        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-gca-dark">Dismissal reason</label>
          <textarea
            value={dismissalReason}
            onChange={(e) => setDismissalReason(e.target.value)}
            rows={2}
            className="rounded-[8px] border border-gca-border bg-white px-[13px] py-[10px] text-[14px] outline-none focus:border-gca-green"
          />
        </div>
      )}

      {error && <p className="text-[13px] text-error-text">{error}</p>}

      <div className="flex justify-end gap-[12px]">
        <button onClick={onCancel} className="cursor-pointer text-[13px] font-medium text-gca-show">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={saving || !riskId}
          className="cursor-pointer rounded-[8px] bg-gca-green px-[14px] py-[8px] text-[13px] font-semibold text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
