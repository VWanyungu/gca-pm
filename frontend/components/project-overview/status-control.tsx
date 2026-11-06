"use client";

import { useRef, useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import useOutsideClick from "@/hooks/use-outside-click";
import type { ProjectStatus } from "./types";

// Deletion isn't offered as a transition here — it's a dedicated Admin-only
// action (DeleteProjectModal), not a status a PM/ExCo can pick from this menu.
const TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  active: ["on_hold", "complete", "cancelled"],
  on_hold: ["active", "cancelled"],
  complete: [],
  cancelled: ["active"],
  deleted: [],
};

const LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  cancelled: "Cancelled",
  deleted: "Deleted",
};

const ACTION_LABELS: Record<ProjectStatus, string> = {
  active: "Reactivate project",
  on_hold: "Put on hold",
  complete: "Mark complete",
  cancelled: "Cancel project",
  deleted: "Delete project",
};

const REASON_REQUIRED: ProjectStatus[] = ["on_hold", "cancelled"];

const WARNINGS: Partial<Record<ProjectStatus, string>> = {
  // cancelled: "Open escalations will be closed. An Admin can reverse this.",
  // on_hold: "Work pauses until the project is reactivated.",
  active: "This reopens the project for active work.",
};

const STATUS_COLOR: Record<ProjectStatus, string> = {
  active: "text-gca-green",
  on_hold: "text-gca-warning",
  complete: "text-gca-green",
  cancelled: "text-error-text",
  deleted: "text-error-text",
};

interface StatusControlProps {
  projectId: string;
  status: ProjectStatus;
  canManage: boolean;
  onChanged: () => void;
  classNames?: string;
  variant?: "default" | "glass";
}

const GLASS_STYLES: Record<ProjectStatus, string> = {
  active: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  complete: "bg-emerald-500/20 text-emerald-300 border-emerald-400/30",
  on_hold: "bg-amber-500/20 text-amber-300 border-amber-400/30",
  cancelled: "bg-rose-500/20 text-rose-300 border-rose-400/30",
  deleted: "bg-rose-500/20 text-rose-300 border-rose-400/30",
};

export function StatusControl({
  projectId,
  status,
  canManage,
  onChanged,
  classNames = "",
  variant = "default",
}: StatusControlProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [target, setTarget] = useState<ProjectStatus | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
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
      setReasonError("A reason is required for this change.");
      return;
    }
    setSubmitting(true);
    setReasonError(null);
    const res = await api.patch(`/projects/${projectId}`, {
      status: target,
      status_reason: reason.trim() || null,
    });
    setSubmitting(false);
    if (res.status !== "success") return;
    setMenuOpen(false);
    setTarget(null);
    setReason("");
    onChanged();
  }

  const isGlass = variant === "glass";

  if (!canManage || options.length === 0) {
    if (isGlass) {
      return (
        <span
          className={`inline-flex items-center rounded-[8px] px-[10px] py-[3px] text-[13px] font-medium backdrop-blur-md border capitalize ${GLASS_STYLES[status]} ${classNames}`}
        >
          {LABELS[status]}
        </span>
      );
    }
    return (
      <span
        className={`rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[14px] font-medium ${classNames}`}
      >
        <span className={STATUS_COLOR[status]}>{LABELS[status]}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className={`relative ${classNames}`}>
      {isGlass ? (
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className={`inline-flex items-center gap-[6px] rounded-[8px] px-[10px] py-[3px] text-[13px] font-medium backdrop-blur-md border capitalize transition-opacity hover:opacity-90 ${GLASS_STYLES[status]}`}
        >
          <span>{LABELS[status]}</span>
          <ChevronDown className="size-[13px] opacity-75" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex justify-between items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface py-[8px] pl-[12px] pr-[10px] shadow-[0px_1px_24px_0px_rgba(23,48,31,0.05)]"
        >
          <span className={`text-[14px] font-medium ${STATUS_COLOR[status]}`}>{LABELS[status]}</span>
          <ChevronDown className="size-[16px] text-gca-muted" />
        </button>
      )}

      {menuOpen && (
        <div
          className={`absolute right-0 ${isGlass ? "top-[38px] backdrop-blur-2xl bg-black/75 border-white/20 text-white shadow-[0px_20px_48px_0px_rgba(0,0,0,0.5)]" : "top-[48px] border-gca-border bg-gca-surface text-gca-dark shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]"} z-50 flex w-[calc(100vw-40px)] max-w-[382px] flex-col gap-[14px] rounded-[12px] border px-[16px] py-[20px] sm:w-[382px] sm:px-[24px]`}
        >
          <p className={`text-[16px] font-semibold ${isGlass ? "text-white" : "text-gca-dark"}`}>
            Change status
          </p>

          <div className="flex flex-col gap-[2px]">
            {options.map((opt) => {
              const selected = target === opt;
              const danger = opt === "cancelled";

              let optionButtonClass = "";
              if (isGlass) {
                if (selected) {
                  optionButtonClass = danger
                    ? "bg-rose-500/25 border border-rose-500/40 text-rose-300"
                    : opt === "on_hold"
                      ? "bg-amber-500/20 border border-amber-500/30 text-amber-300"
                      : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300";
                } else {
                  optionButtonClass = "border border-transparent hover:bg-white/10 text-white/90 hover:text-white";
                }
              } else {
                if (selected) {
                  optionButtonClass = danger ? "bg-error-bg" : "bg-gca-badge-bg";
                } else {
                  optionButtonClass = "hover:bg-gca-page-bg";
                }
              }

              let dotClass = "";
              if (danger) {
                dotClass = selected
                  ? isGlass
                    ? "border-rose-400 bg-rose-400"
                    : "border-error-text bg-error-text"
                  : isGlass
                    ? "border-rose-400"
                    : "border-error-text";
              } else if (opt === "on_hold") {
                dotClass = selected
                  ? isGlass
                    ? "border-amber-400 bg-amber-400"
                    : "border-gca-warning bg-gca-warning"
                  : isGlass
                    ? "border-amber-400"
                    : "border-gca-warning";
              } else {
                dotClass = selected
                  ? isGlass
                    ? "border-emerald-400 bg-emerald-400"
                    : "border-gca-green bg-gca-green"
                  : isGlass
                    ? "border-emerald-400"
                    : "border-gca-green";
              }

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTarget(selected ? null : opt)}
                  className={`flex w-full items-center gap-[10px] rounded-[8px] px-[12px] py-[9px] text-left transition-colors ${optionButtonClass}`}
                >
                  <span className={`size-[18px] shrink-0 rounded-full border-2 ${dotClass}`} />
                  <span
                    className={`text-[14px] ${
                      selected
                        ? `font-medium ${danger ? (isGlass ? "text-rose-300" : "text-error-text") : (isGlass ? "text-white" : "text-gca-dark")}`
                        : `font-normal ${isGlass ? "text-white/90" : "text-gca-dark"}`
                    }`}
                  >
                    {ACTION_LABELS[opt]}
                  </span>
                </button>
              );
            })}
          </div>

          {target && (
            <>
              {WARNINGS[target] && (
                <p className={`text-[12px] ${isGlass ? "text-amber-200/90" : "text-gca-show"}`}>
                  {WARNINGS[target]}
                </p>
              )}

              {REASON_REQUIRED.includes(target) && (
                <div className="flex flex-col gap-[6px]">
                  <label
                    className={`text-[13px] font-medium ${isGlass ? "text-white/90" : "text-gca-dark"}`}
                  >
                    Reason <span className={isGlass ? "text-rose-400" : "text-error-text"}>*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setReasonError(null);
                    }}
                    placeholder={
                      target === "cancelled" ? "Why is it being cancelled?" : "Why is it on hold?"
                    }
                    aria-invalid={!!reasonError}
                    className={`h-[80px] resize-none rounded-[8px] border px-[12px] py-[11px] text-[14px] outline-none transition-colors ${
                      isGlass
                        ? `bg-white/10 text-white placeholder:text-white/40 focus:border-emerald-400 focus:bg-white/15 ${
                            reasonError ? "border-rose-400" : "border-white/20"
                          }`
                        : `border text-gca-dark focus:border-gca-green ${
                            reasonError ? "border-error-border" : "border-gca-border"
                          }`
                    }`}
                  />
                  {reasonError && (
                    <span className={`text-[12px] ${isGlass ? "text-rose-400" : "text-error-text"}`}>
                      {reasonError}
                    </span>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  className={`rounded-[8px] border px-[12px] py-[7px] text-[13px] font-semibold transition-colors ${
                    isGlass
                      ? "border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                      : "border-gca-border text-gca-dark hover:bg-gca-page-bg"
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={confirmChange}
                  disabled={submitting}
                  className={`relative flex items-center justify-center gap-[6px] rounded-[8px] px-[12px] py-[7px] text-[13px] font-semibold text-gca-on-accent transition-colors disabled:opacity-50 ${
                    target === "cancelled"
                      ? isGlass
                        ? "bg-rose-600 hover:bg-rose-700 text-white border border-rose-500/40"
                        : "bg-error-text"
                      : isGlass
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40"
                        : "bg-gca-green hover:bg-gca-green-hover"
                  }`}
                >
                  <span className={submitting ? "invisible" : undefined}>
                    {ACTION_LABELS[target]}
                  </span>
                  {submitting && (
                    <LoaderCircle
                      className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                      aria-label="Saving"
                    />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
