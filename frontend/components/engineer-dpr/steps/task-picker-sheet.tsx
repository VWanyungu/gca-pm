"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useScheduleTasks } from "@/components/schedule/use-schedule-data";
import type { ScheduleTask } from "@/components/schedule/types";

interface TaskPickerSheetProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPick: (task: ScheduleTask) => void;
}

/** Inline picker — part of the page flow, not a modal overlay, so it sits naturally in the
 *  desktop project view as well as the mobile wizard. */
export function TaskPickerSheet({ projectId, open, onClose, onPick }: TaskPickerSheetProps) {
  const { data: tasks = [] } = useScheduleTasks(projectId);
  const [search, setSearch] = useState("");

  if (!open) return null;

  // A task already at 100% has no progress left to report, so offering it only invites a
  // reconciliation flag.
  const pickable = tasks
    .filter((t) => !t.is_summary)
    .filter((t) => Number(t.pct_work_complete) < 100)
    .filter((t) => t.task_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-[10px] rounded-[12px] border border-gca-border bg-gca-surface p-[16px]">
      <div className="flex items-center justify-between gap-[8px]">
        <p className="text-[14px] font-semibold text-gca-dark">Add schedule task</p>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer text-[13px] font-medium text-gca-show"
        >
          Close
        </button>
      </div>
      <label className="flex h-[40px] items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px]">
        <Search className="size-[14px] shrink-0 text-gca-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="min-w-0 w-full bg-transparent text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
        />
      </label>
      <div className="flex max-h-[280px] flex-col overflow-y-auto">
        {pickable.length === 0 ? (
          <p className="py-[12px] text-[14px] text-gca-show">
            No incomplete schedule tasks available.
          </p>
        ) : (
          pickable.map((task, i) => (
            <button
              key={task.task_id}
              type="button"
              onClick={() => {
                onPick(task);
                onClose();
              }}
              className={`flex cursor-pointer items-center justify-between py-[12px] text-left ${
                i > 0 ? "border-t border-gca-border" : ""
              }`}
            >
              <div className="flex flex-col gap-[2px]">
                <p className="text-[15px] font-medium text-gca-dark">{task.task_name}</p>
                <p className="text-[12px] text-gca-muted">{task.wbs ?? "—"}</p>
              </div>
              <p className="text-[13px] text-gca-show">{Number(task.pct_work_complete)}%</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
