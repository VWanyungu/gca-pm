"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useStageChecklist, useStageViewInvalidate } from "./use-stage-view-data";

interface ChecklistCardProps {
  projectId: string;
  stageNo: number;
  canManage: boolean;
  revealed: boolean;
  onRemoved: () => void;
}

export function ChecklistCard({ projectId, stageNo, canManage, revealed, onRemoved }: ChecklistCardProps) {
  const { data: items = [] } = useStageChecklist(projectId, stageNo);
  const invalidate = useStageViewInvalidate(projectId, stageNo);
  const [newItemText, setNewItemText] = useState("");
  const [saving, setSaving] = useState(false);

  if (!revealed && items.length === 0) return null;

  const doneCount = items.filter((item) => item.is_checked).length;

  async function toggle(itemId: string, checked: boolean) {
    await api.patch(`/projects/${projectId}/stages/${stageNo}/checklist/${itemId}`, { is_checked: !checked });
    invalidate();
  }

  async function addItem() {
    if (!newItemText.trim()) return;
    setSaving(true);
    await api.post(`/projects/${projectId}/stages/${stageNo}/checklist`, { text: newItemText.trim() });
    setSaving(false);
    setNewItemText("");
    invalidate();
  }

  async function removeItem(itemId: string) {
    await api.delete(`/projects/${projectId}/stages/${stageNo}/checklist/${itemId}`);
    invalidate();
  }

  async function removeChecklist() {
    await api.delete(`/projects/${projectId}/stages/${stageNo}/checklist`);
    invalidate();
    onRemoved();
  }

  return (
    <div className="flex w-full flex-col gap-[12px]">
      <div className="flex flex-col gap-[2px]">
        <p className="text-[16px] font-semibold text-gca-dark">Checklist</p>
        <p className="text-[13px] text-gca-show">
          {doneCount} of {items.length} done · saved to this project
        </p>
      </div>

      <div className="flex flex-col">
        {items.map((item, i) => (
          <div
            key={item.item_id}
            className={`flex items-center justify-between py-[9px] ${i > 0 ? "border-t border-gca-border" : ""}`}
          >
            <button
              disabled={!canManage}
              onClick={() => toggle(item.item_id, item.is_checked)}
              className="flex items-center gap-[10px] text-left disabled:cursor-default"
            >
              <span
                className={`flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${
                  item.is_checked ? "border-gca-green bg-gca-green" : "border-[#c9d3cb] bg-white"
                }`}
              >
                {item.is_checked && (
                  <svg viewBox="0 0 10 8" className="size-[10px]" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className={`text-[13px] ${item.is_checked ? "text-gca-show" : "text-gca-dark"}`}>{item.text}</span>
            </button>
            {canManage && (
              <button onClick={() => removeItem(item.item_id)} className="shrink-0 text-gca-muted">
                <X className="size-[18px]" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <>
          <div className="flex w-full items-center gap-[8px]">
            <input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Add an item"
              className="h-[39px] w-full rounded-[8px] border border-gca-border bg-white px-[12px] text-[14px] outline-none focus:border-gca-green"
            />
            <button
              onClick={addItem}
              disabled={saving || !newItemText.trim()}
              className="h-[39px] shrink-0 rounded-[8px] border border-gca-border bg-white px-[12px] text-[13px] font-semibold text-gca-dark hover:bg-gca-page-bg disabled:opacity-50"
            >
              Add
            </button>
          </div>

          <button onClick={removeChecklist} className="text-left text-[13px] font-medium text-error-text">
            Remove checklist
          </button>
        </>
      )}
    </div>
  );
}
