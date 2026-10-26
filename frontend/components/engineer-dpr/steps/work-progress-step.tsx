"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ScheduleTask } from "@/components/schedule/types";
import type {
  DprDraftInput,
  DprValidationErrors,
  DraftActivityProgress,
  DraftWorkItem,
} from "../types";
import { TaskPickerSheet } from "./task-picker-sheet";

interface StepProps {
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
  errors?: DprValidationErrors["workItems"];
  activityErrors?: DprValidationErrors["activityProgress"];
}

export function WorkProgressStep({
  draft,
  update,
  projectId,
  errors = {},
  activityErrors = {},
}: StepProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function updateWorkItem(index: number, patch: Partial<DraftWorkItem>) {
    const next = draft.work_items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    update({ work_items: next });
  }

  function removeWorkItem(index: number) {
    update({ work_items: draft.work_items.filter((_, i) => i !== index) });
  }

  function addWorkItem() {
    update({ work_items: [...draft.work_items, { work_area: "", work_carried_out: "" }] });
  }

  function updateActivity(index: number, patch: Partial<DraftActivityProgress>) {
    const next = draft.activity_progress.map((row, i) =>
      i === index ? { ...row, ...patch } : row,
    );
    update({ activity_progress: next });
  }

  function removeActivity(index: number) {
    update({ activity_progress: draft.activity_progress.filter((_, i) => i !== index) });
  }

  function addFreeTextActivity() {
    update({
      activity_progress: [
        ...draft.activity_progress,
        { source: "free_text", task_id: null, free_text: "", today_pct: 0, total_pct: 0 },
      ],
    });
  }

  function addScheduleTaskActivity(task: ScheduleTask) {
    const currentPct = Number(task.pct_work_complete);
    update({
      activity_progress: [
        ...draft.activity_progress,
        {
          source: "schedule_task",
          task_id: task.task_id,
          task_name: task.task_name,
          free_text: null,
          today_pct: 0,
          total_pct: currentPct,
          current_pct: currentPct,
        },
      ],
    });
  }

  /** Today's increment is derived from the gap to the new total, not typed in. */
  function updateScheduleTaskTotal(index: number, newTotal: number) {
    const row = draft.activity_progress[index];
    const currentPct = row.current_pct ?? 0;
    updateActivity(index, { total_pct: newTotal, today_pct: Math.max(0, newTotal - currentPct) });
  }

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <p className="text-[14px] font-semibold text-gca-dark">Work items</p>
        {draft.work_items.map((item, index) => {
          const itemErrors = errors[index];
          return (
            <div key={index} className="flex flex-col gap-[10px] rounded-[12px] bg-gca-surface p-[16px]">
              <div className="flex items-center justify-between gap-[8px]">
                <div className="flex w-full flex-col gap-[4px]">
                  <input
                    value={item.work_area}
                    onChange={(e) => updateWorkItem(index, { work_area: e.target.value })}
                    placeholder="Work area"
                    aria-invalid={!!itemErrors?.work_area}
                    className={`h-[44px] w-full rounded-[8px] border bg-gca-surface px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted ${
                      itemErrors?.work_area ? "border-error-border" : "border-gca-border"
                    }`}
                  />
                  {itemErrors?.work_area && (
                    <span className="text-[12px] text-error-text">Work area is required</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeWorkItem(index)}
                  aria-label="Remove work item"
                  className="flex size-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border"
                >
                  <Trash2 className="size-[16px] text-error-text" />
                </button>
              </div>
              <div className="flex flex-col gap-[4px]">
                <textarea
                  value={item.work_carried_out}
                  onChange={(e) => updateWorkItem(index, { work_carried_out: e.target.value })}
                  placeholder="Work carried out"
                  rows={3}
                  aria-invalid={!!itemErrors?.work_carried_out}
                  className={`w-full rounded-[8px] border bg-gca-surface p-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted ${
                    itemErrors?.work_carried_out ? "border-error-border" : "border-gca-border"
                  }`}
                />
                {itemErrors?.work_carried_out && (
                  <span className="text-[12px] text-error-text">Work carried out is required</span>
                )}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={addWorkItem}
          className="flex cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border py-[14px] text-[14px] font-medium text-gca-green"
        >
          <Plus className="size-[14px]" />
          Add work area
        </button>
      </div>

      <div className="flex flex-col gap-[6px]">
        <p className="text-[14px] font-semibold text-gca-dark">Activity progress</p>
        {draft.activity_progress.map((row, index) => (
          <div key={index} className="flex flex-col gap-[10px] rounded-[12px] bg-gca-surface p-[16px]">
            <div className="flex items-start justify-between gap-[8px]">
              {row.source === "schedule_task" ? (
                <p className="text-[15px] font-semibold text-gca-dark">{row.task_name}</p>
              ) : (
                <span className="rounded-[999px] bg-gca-warning-bg px-[9px] py-[3px] text-[11px] font-semibold text-gca-warning">
                  Custom task
                </span>
              )}
              <button
                type="button"
                onClick={() => removeActivity(index)}
                aria-label="Remove activity"
                className="flex size-[28px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border"
              >
                <Trash2 className="size-[14px] text-error-text" />
              </button>
            </div>

            {row.source === "free_text" ? (
              <textarea
                value={row.free_text ?? ""}
                onChange={(e) => updateActivity(index, { free_text: e.target.value })}
                placeholder="Describe the work"
                rows={3}
                className="w-full rounded-[8px] border border-gca-border bg-gca-surface p-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted"
              />
            ) : null}

            {row.source === "schedule_task" ? (
              <div className="flex gap-[16px]">
                <div className="flex w-full flex-col gap-[4px]">
                  <span className="text-[13px] font-medium text-gca-dark">Current completion</span>
                  <p className="flex h-[44px] w-full items-center rounded-[8px] bg-gca-page-bg px-[12px] text-[15px] text-gca-show">
                    {row.current_pct ?? 0}%
                  </p>
                </div>
                <div className="flex w-full flex-col gap-[4px]">
                  <span className="text-[13px] font-medium text-gca-dark">
                    New total completion
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={row.total_pct}
                    aria-invalid={!!activityErrors[index]?.total_pct}
                    onChange={(e) => updateScheduleTaskTotal(index, Number(e.target.value))}
                    className={`h-[44px] w-full rounded-[8px] border bg-gca-surface px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green ${
                      activityErrors[index]?.total_pct ? "border-error-border" : "border-gca-border"
                    }`}
                  />
                  {activityErrors[index]?.total_pct && (
                    <span className="text-[12px] text-error-text">
                      New total completion must be above 0%
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-[16px]">
                <div className="flex w-full flex-col gap-[4px]">
                  <span className="text-[13px] font-medium text-gca-dark">Today %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.today_pct}
                    onChange={(e) =>
                      updateActivity(index, {
                        today_pct: Math.min(Number(e.target.value), row.total_pct),
                      })
                    }
                    className="h-[44px] w-full rounded-[8px] border border-gca-border bg-gca-surface px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green"
                  />
                </div>
                <div className="flex w-full flex-col gap-[4px]">
                  <span className="text-[13px] font-medium text-gca-dark">Total %</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={row.total_pct}
                    aria-invalid={!!activityErrors[index]?.total_pct}
                    onChange={(e) => updateActivity(index, { total_pct: Number(e.target.value) })}
                    className={`h-[44px] w-full rounded-[8px] border bg-gca-surface px-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green ${
                      activityErrors[index]?.total_pct ? "border-error-border" : "border-gca-border"
                    }`}
                  />
                  {activityErrors[index]?.total_pct && (
                    <span className="text-[12px] text-error-text">Total % must be above 0</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-[12px]">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex flex-1 cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border py-[14px] text-[14px] font-medium text-gca-green"
          >
            <Plus className="size-[14px]" />
            Schedule task
          </button>
          <button
            type="button"
            onClick={addFreeTextActivity}
            className="flex flex-1 cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border py-[14px] text-[14px] font-medium text-gca-green"
          >
            <Plus className="size-[14px]" />
            Custom task
          </button>
        </div>
      </div>

      <TaskPickerSheet
        projectId={projectId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addScheduleTaskActivity}
      />
    </div>
  );
}
