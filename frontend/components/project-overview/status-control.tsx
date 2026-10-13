"use client";

import { useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { api } from "@/lib/api-client";
import useOutsideClick from "@/hooks/use-outside-click";
import type { ProjectStatus } from "./types";

const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  active: ["on_hold", "complete", "cancelled"],
  on_hold: ["active", "cancelled"],
  complete: [],
  cancelled: ["active"],
};

const LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  cancelled: "Cancelled",
};

const ACTION_LABELS: Record<ProjectStatus, string> = {
  active: "Reactivate project",
  on_hold: "Put on hold",
  complete: "Mark complete",
  cancelled: "Cancel project",
};

const REASON_REQUIRED: ProjectStatus[] = ["on_hold", "cancelled"];

const WARNINGS: Partial<Record<ProjectStatus, string>> = {
  cancelled: "Open escalations will be closed. An Admin can reverse this.",
  on_hold: "Work pauses until the project is reactivated.",
  active: "This reopens the project for active work.",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "text-gca-green",
  on_hold: "text-gca-warning",
  complete: "text-gca-green",
  cancelled: "text-error-text",
};

interface StatusControlProps {
  projectId: string;
  status: ProjectStatus;
  canManage: boolean;
  onChanged: () => void;
}

export function StatusControl({ projectId, status, canManage, onChanged }: StatusControlProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [target, setTarget] = useState<ProjectStatus | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick({
    ref,
    handler: () => {
      setMenuOpen(false);
      setTarget(null);
    },
  });

  const options = TRANSITIONS[status];

  async function confirmChange() {
    if (!target) return;
    if (REASON_REQUIRED.includes(target) && !reason.trim()) {
      setError("A reason is required for this change.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await api.patch(`/projects/${projectId}`, {
      status: target,
      status_reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (res.status !== "success") {
      setError(res.message);
      return;
    }
    setMenuOpen(false);
    setTarget(null);
    setReason("");
    onChanged();
  }

  if (!canManage || options.length === 0) {
    return (
      <span className="rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[14px] font-medium">
        <span className={STATUS_COLOR[status]}>{LABELS[status]}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-white py-[8px] pl-[12px] pr-[10px] shadow-[0px_1px_24px_0px_rgba(23,48,31,0.05)]"
      >
        <span className={`text-[14px] font-medium ${STATUS_COLOR[status]}`}>{LABELS[status]}</span>
        <ChevronDown className="size-[16px] text-gca-muted" />
      </button>

      {menuOpen && !target && (
        <div className="absolute right-0 top-[48px] z-50 w-[220px] rounded-[10px] border border-gca-border bg-white py-[8px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
          <button
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center justify-between px-[14px] py-[8px] text-left"
          >
            <span className="text-[14px] font-medium text-gca-dark">{LABELS[status]}</span>
            <Check className="size-[14px] text-gca-green" />
          </button>
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => setTarget(opt)}
              className="flex w-full flex-col items-start px-[14px] py-[8px] text-left hover:bg-gca-page-bg"
            >
              <span className="text-[14px] font-medium text-gca-dark">{ACTION_LABELS[opt]}</span>
              {REASON_REQUIRED.includes(opt) && (
                <span className="text-[12px] text-gca-muted">Reason required</span>
              )}
            </button>
          ))}
        </div>
      )}

      {target && (
        <div className="absolute right-0 top-[48px] z-50 w-[300px] rounded-[12px] border border-gca-border bg-white p-[16px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
          <p className="text-[15px] font-semibold text-gca-dark">Change status</p>
          <div className="mt-[12px] flex flex-col gap-[6px]">
            <p
              className={`rounded-[8px] px-[12px] py-[8px] text-[14px] font-medium ${
                target === "cancelled" ? "bg-error-bg text-error-text" : "bg-gca-page-bg text-gca-dark"
              }`}
            >
              {ACTION_LABELS[target]}
            </p>
            {WARNINGS[target] && <p className="text-[12px] text-gca-muted">{WARNINGS[target]}</p>}
          </div>

          {REASON_REQUIRED.includes(target) && (
            <div className="mt-[12px] flex flex-col gap-[6px]">
              <label className="text-[13px] font-medium text-gca-show">
                Reason <span className="text-error-text">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={target === "cancelled" ? "Why is it being cancelled?" : "Why is it on hold?"}
                className="h-[72px] resize-none rounded-[8px] border border-gca-border p-[10px] text-[13px] text-gca-dark outline-none focus:border-gca-green"
              />
            </div>
          )}

          {error && <p className="mt-[8px] text-[12px] text-error-text">{error}</p>}

          <div className="mt-[14px] flex justify-end gap-[8px]">
            <button
              onClick={() => setTarget(null)}
              className="rounded-[8px] border border-gca-border px-[14px] py-[8px] text-[13px] font-semibold text-gca-dark"
            >
              Back
            </button>
            <button
              onClick={confirmChange}
              disabled={submitting}
              className={`rounded-[8px] px-[14px] py-[8px] text-[13px] font-semibold text-white disabled:opacity-50 ${
                target === "cancelled" ? "bg-error-text" : "bg-gca-green hover:bg-gca-green-hover"
              }`}
            >
              {ACTION_LABELS[target]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
