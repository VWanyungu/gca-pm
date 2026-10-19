"use client";

import { useScheduleTasks } from "@/components/schedule/use-schedule-data";
import type { ScheduleTask } from "@/components/schedule/types";

interface TaskPickerSheetProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onPick: (task: ScheduleTask) => void;
}

export function TaskPickerSheet({ projectId, open, onClose, onPick }: TaskPickerSheetProps) {
  const { data: tasks = [] } = useScheduleTasks(projectId);

  if (!open) return null;

  const pickable = tasks.filter((t) => !t.is_summary);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] flex-col gap-[14px] overflow-y-auto rounded-t-[16px] bg-white px-[16px] pt-[16px] pb-[34px]">
        <div className="flex items-center justify-center">
          <span className="h-[4px] w-[36px] rounded-[2px] bg-gca-border" />
        </div>
        <p className="text-[18px] font-semibold text-gca-dark">Add schedule task</p>
        <div className="flex flex-col">
          {pickable.length === 0 ? (
            <p className="py-[12px] text-[14px] text-gca-show">No schedule tasks available.</p>
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
    </>
  );
}
