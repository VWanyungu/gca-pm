"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Lock, ChevronsUpDown } from "lucide-react";
import { api } from "@/lib/api-client";
import useOutsideClick from "@/hooks/use-outside-click";
import { STAGE_SHORT_NAME, type StageRow } from "./types";

const STATE_LABEL: Record<StageRow["state"], string> = {
  not_started: "Not started",
  active: "In progress",
  inactive: "Paused",
  complete: "Done",
};

interface StagePipelineProps {
  projectId: string;
  stages: StageRow[];
  currentStage?: StageRow;
  percentByStage: Record<number, number>;
  canManage: boolean;
  onChanged: () => void;
}

export function StagePipeline({
  projectId,
  stages,
  currentStage,
  percentByStage,
  canManage,
  onChanged,
}: StagePipelineProps) {
  const [editMode, setEditMode] = useState(false);
  const [pendingScope, setPendingScope] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStageNo, setSelectedStageNo] = useState<number>(currentStage?.stage_no ?? 0);
  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick({ ref: menuRef, handler: () => setMenuOpen(false) });

  useEffect(() => {
    if (currentStage) setSelectedStageNo(currentStage.stage_no);
  }, [currentStage]);

  const sorted = [...stages].sort((a, b) => a.stage_no - b.stage_no);
  const current = sorted.find((s) => s.stage_no === selectedStageNo);
  const inScopeCount = stages.filter((s) => s.in_scope).length;

  function startEdit() {
    setPendingScope(new Set(stages.filter((s) => s.in_scope).map((s) => s.stage_no)));
    setEditMode(true);
  }

  function toggleScope(stageNo: number, locked: boolean) {
    if (locked) return;
    setPendingScope((prev) => {
      const next = new Set(prev);
      if (next.has(stageNo)) next.delete(stageNo);
      else next.add(stageNo);
      return next;
    });
  }

  async function saveScope() {
    setSaving(true);
    const changed = stages.filter((s) => s.in_scope !== pendingScope.has(s.stage_no));
    const results = await Promise.all(
      changed.map((s) =>
        api.patch(`/projects/${projectId}/stages/${s.stage_no}`, {
          in_scope: pendingScope.has(s.stage_no),
        }),
      ),
    );
    setSaving(false);
    const failed = results.find((r) => r.status !== "success");
    if (failed) return;
    setEditMode(false);
    onChanged();
  }

  async function setCurrentStage(stageNo: number) {
    const previousStageNo = selectedStageNo;
    setSelectedStageNo(stageNo);
    setMenuOpen(false);
    const res = await api.patch(`/projects/${projectId}/stages/${stageNo}`, { state: "active" });
    if (res.status !== "success") {
      setSelectedStageNo(previousStageNo);
      return;
    }
    onChanged();
  }

  return (
    <section className="flex w-full flex-col gap-[16px] pb-[20px]">
      <div className="flex w-full flex-wrap items-center justify-between gap-[12px]">
        <div className="flex min-w-0 items-center gap-[14px]">
          <h2 className="text-[16px] font-semibold text-gca-dark">Stages</h2>
          {editMode && <p className="text-[13px] text-gca-green">Edit scope</p>}
          {!editMode && current && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface py-[2px] pl-[10px] pr-[8px]"
              >
                <span className="text-[13px] text-gca-show font-light">Current</span>
                <span className="text-[13px] font-medium text-gca-dark">
                  {STAGE_SHORT_NAME[current.stage_no]}
                </span>
                <ChevronsUpDown className="size-[13px] text-gca-muted" />
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-[36px] z-50 flex w-[calc(100vw-40px)] max-w-[282px] flex-col gap-[2px] rounded-[12px] border border-gca-border bg-gca-surface p-[8px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)] sm:w-[282px]">
                  <p className="px-[10px] pb-[6px] pt-[2px] text-[12px] font-medium text-gca-muted">
                    Set current stage
                  </p>
                  {sorted
                    .filter((s) => s.in_scope)
                    .map((s) => {
                      const selected = s.stage_no === selectedStageNo;
                      return (
                        <button
                          key={s.stage_no}
                          onClick={() => setCurrentStage(s.stage_no)}
                          className={`flex w-full items-center justify-between gap-[10px] rounded-[6px] px-[10px] py-[8px] text-left ${
                            selected ? "bg-gca-badge-bg" : "hover:bg-gca-page-bg"
                          }`}
                        >
                          <span className="flex items-center gap-[8px]">
                            <span className="flex size-[14px] shrink-0 items-center justify-center">
                              {selected && <Check className="size-[14px] text-gca-badge-text" />}
                            </span>
                            <span
                              className={`text-[14px] ${selected ? "font-semibold text-gca-badge-text" : "font-normal text-gca-dark"}`}
                            >
                              {STAGE_SHORT_NAME[s.stage_no]}
                            </span>
                          </span>
                          <span
                            className={`font-mono text-[12px] ${selected ? "text-gca-badge-text" : "text-gca-muted"}`}
                          >
                            {s.state === "complete"
                              ? "Done"
                              : s.state === "active"
                                ? `${percentByStage[s.stage_no] ?? 0}%`
                                : "Not started"}
                          </span>
                        </button>
                      );
                    })}
                  {stages.length - inScopeCount > 0 && (
                    <>
                      <div className="my-[4px] h-px bg-gca-border" />
                      <p className="px-[10px] pb-[2px] pt-[6px] text-[12px] text-gca-muted">
                        {sorted
                          .filter((s) => !s.in_scope)
                          .map((s) => `${STAGE_SHORT_NAME[s.stage_no]}, `)}{" "}
                        is out of scope
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {canManage &&
          (editMode ? (
            <div className="flex items-center gap-[16px]">
              <button
                onClick={() => setEditMode(false)}
                className="text-[13px] font-medium text-gca-show"
              >
                Cancel
              </button>
              <button
                onClick={saveScope}
                disabled={saving}
                className="rounded-[8px] bg-gca-green px-[14px] py-[7px] text-[13px] font-semibold text-gca-on-accent disabled:opacity-50"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
            >
              Edit scope
              {/* <ChevronDown className="size-[18] -rotate-90" /> */}
            </button>
          ))}
      </div>

      <div className="no-scrollbar -mx-[20px] flex w-[calc(100%+40px)] items-start gap-[12px] overflow-x-auto px-[20px] xl:mx-0 xl:w-full xl:justify-between xl:gap-0 xl:overflow-visible">
        {sorted.map((s) => {
          const locked = s.state !== "not_started";
          const checked = editMode ? pendingScope.has(s.stage_no) : s.in_scope;
          const pct =
            s.state === "complete"
              ? 100
              : s.state === "active"
                ? (percentByStage[s.stage_no] ?? 0)
                : 0;

          const columnClassName = "flex w-[98px] shrink-0 flex-col gap-[6px]";
          const columnContent = (
            <>
              {s.in_scope ? (
                <div className="h-[6px] w-[98px] overflow-hidden rounded-[3px] bg-gca-border">
                  <div
                    className={`h-[6px] rounded-[3px] ${s.state === "complete" ? "bg-gca-green/55" : "bg-gca-green"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : (
                <div className="h-[6px] w-[98px] rounded-[3px] border border-dashed border-gca-border" />
              )}
              <div className="flex gap-[6px] items-center">
                {editMode && (
                  <>
                    {locked ? (
                      <Lock className="size-[14] text-gca-muted" />
                    ) : (
                      <button
                        onClick={() => toggleScope(s.stage_no, locked)}
                        disabled={locked}
                        className="flex size-[18px] items-center justify-center border-2 border-gca-border rounded-[4px] disabled:cursor-not-allowed"
                      >
                        {checked && <Check className="size-[12px] text-gca-green" />}
                      </button>
                    )}
                  </>
                )}

                <p
                  className={`text-[12px] w-[98px] ${s.state === "active" ? "font-semibold text-gca-dark" : "font-medium text-gca-muted"}`}
                >
                  {STAGE_SHORT_NAME[s.stage_no]}
                </p>
              </div>

              <p
                className={`text-[12px] w-[98px] ${s.state === "active" ? "text-gca-green" : "text-gca-muted"}`}
              >
                {!checked
                  ? "Out of scope"
                  : s.state === "active"
                    ? `${pct}%`
                    : STATE_LABEL[s.state]}
              </p>
            </>
          );

          return editMode ? (
            <div key={s.stage_no} className={columnClassName}>
              {columnContent}
            </div>
          ) : (
            <Link
              key={s.stage_no}
              href={`/projects/${projectId}/stages/${s.stage_no}`}
              className={columnClassName}
            >
              {columnContent}
            </Link>
          );
        })}
      </div>

      {editMode && (
        <p className="flex items-center gap-[6px] text-[12px] text-gca-muted">
          <Lock className="size-[10px]" />
          {inScopeCount} of {stages.length} in scope · Stages with open work are locked
        </p>
      )}
    </section>
  );
}
