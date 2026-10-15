"use client";

import { useState } from "react";
import { Plus, ClipboardList, Check } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { api } from "@/lib/api-client";
import { useStageActivitiesPaged, useStageViewInvalidate } from "./use-stage-view-data";
import type { StageActivity, TeamMember } from "@/components/project-overview/types";

const STATUS_STYLE: Record<string, string> = {
  done: "text-gca-green",
  open: "text-gca-show",
  in_progress: "text-gca-show",
  cancelled: "text-gca-muted",
};

function isOverdue(activity: StageActivity) {
  return activity.status === "open" && !!activity.due_date && new Date(activity.due_date) < new Date();
}

function statusLabel(activity: StageActivity) {
  if (isOverdue(activity)) return "Overdue";
  if (activity.status === "in_progress") return "In progress";
  if (activity.status === "cancelled") return "Cancelled";
  return activity.status === "done" ? "Done" : "Open";
}

function ownerName(ownerId: string | null, team: TeamMember[]) {
  if (!ownerId) return "Unassigned";
  const member = team.find((m) => m.user_id === ownerId);
  return member ? `${member.first_name[0]}. ${member.last_name}` : "—";
}

interface ActivitiesTableProps {
  projectId: string;
  stageNo: number;
  team: TeamMember[];
  onAddActivity: () => void;
  onOpenActivity: (activityId: string) => void;
}

export function ActivitiesTable({ projectId, stageNo, team, onAddActivity, onOpenActivity }: ActivitiesTableProps) {
  const [tab, setTab] = useState<"all" | "open" | "done">("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const invalidate = useStageViewInvalidate(projectId, stageNo);

  const { data } = useStageActivitiesPaged({
    projectId,
    stageNo,
    status: tab === "all" ? undefined : tab,
    page,
    limit: perPage,
  });

  const activities = data?.stageActivities ?? [];
  const total = data?.pagination.total ?? 0;
  const pages = data?.pagination.pages ?? 1;
  const doneCount = activities.filter((a) => a.status === "done").length;
  const selectableIds = activities.filter((a) => a.status !== "done").map((a) => a.activity_id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function changeTab(next: "all" | "open" | "done") {
    setTab(next);
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelected(activityId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function markSelectedComplete() {
    setMarking(true);
    await Promise.all(
      [...selected].map((id) => api.patch(`/projects/${projectId}/stage-activities/${id}`, { status: "done" })),
    );
    setMarking(false);
    setSelected(new Set());
    invalidate();
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col gap-[2px]">
          <p className="text-[16px] font-semibold text-gca-dark">Activities</p>
          <p className="text-[13px] text-gca-show">
            {total === 0 ? "No activities yet" : `${doneCount} of ${activities.length} done`}
          </p>
        </div>
        <div className="flex items-center gap-[12px]">
          <div className="flex items-center gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
            {(["all", "open", "done"] as const).map((t) => (
              <button
                key={t}
                onClick={() => changeTab(t)}
                className={`rounded-[6px] px-[10px] py-[5px] text-[13px] ${
                  tab === t
                    ? "bg-white font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                    : "font-normal text-gca-show"
                }`}
              >
                {t === "all" ? "All" : t === "open" ? "Open" : "Done"}
              </button>
            ))}
          </div>
          <button
            onClick={onAddActivity}
            className="flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
          >
            <Plus className="size-[10px]" />
            Add activity
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center gap-[16px] py-[56px]">
          <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
            <ClipboardList className="size-[18px] text-gca-green" />
          </span>
          <div className="flex flex-col items-center gap-[4px] text-center">
            <p className="text-[14px] font-semibold text-gca-dark">Plan the work for this stage</p>
            <p className="max-w-[420px] text-[13px] text-gca-show">
              Add activities with an owner and due date. They show on the overview when overdue.
            </p>
          </div>
          <button
            onClick={onAddActivity}
            className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
          >
            Add activity
          </button>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex w-full items-center justify-between rounded-[10px] bg-gca-badge-bg px-[16px] py-[10px]">
              <button onClick={toggleSelectAll} className="flex items-center gap-[10px]">
                <span className="flex size-[16px] items-center justify-center rounded-[4px] border-2 border-gca-green bg-gca-green">
                  <Check className="size-[11px] text-white" />
                </span>
                <span className="text-[13px] font-medium text-gca-badge-text">{selected.size} selected</span>
              </button>
              <button
                onClick={markSelectedComplete}
                disabled={marking}
                className="rounded-[8px] bg-gca-green px-[16px] py-[8px] text-[13px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
              >
                Mark {selected.size} as complete
              </button>
            </div>
          )}

          <div className="flex w-full flex-col">
            <div className="flex w-full items-center gap-[10px] py-[8px] text-[12px] font-medium text-gca-muted">
              <span className="flex size-[16px] shrink-0 items-center justify-center">
                {selectableIds.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className={`flex size-[16px] items-center justify-center rounded-[4px] border-2 ${
                      allSelected ? "border-gca-green bg-gca-green" : "border-gca-border"
                    }`}
                  >
                    {allSelected && <Check className="size-[11px] text-white" />}
                  </button>
                )}
              </span>
              <p className="w-[57%]">Activity</p>
              <p className="w-[20%]">Due</p>
              <p className="w-[20%]">Status</p>
            </div>
            {activities.map((activity, i) => (
              <div
                key={activity.activity_id}
                className={`flex w-full items-center gap-[10px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
              >
                <span className="flex size-[16px] shrink-0 items-center justify-center">
                  {activity.status !== "done" && (
                    <button
                      onClick={() => toggleSelected(activity.activity_id)}
                      className={`flex size-[16px] items-center justify-center rounded-[4px] border-2 ${
                        selected.has(activity.activity_id) ? "border-gca-green bg-gca-green" : "border-gca-border"
                      }`}
                    >
                      {selected.has(activity.activity_id) && <Check className="size-[11px] text-white" />}
                    </button>
                  )}
                </span>
                <button
                  onClick={() => onOpenActivity(activity.activity_id)}
                  className="flex flex-1 items-center text-left"
                >
                  <div className="flex w-[60%] items-center gap-[10px]">
                    <span
                      className={`flex size-[16px] shrink-0 items-center justify-center rounded-[4px] border-2 ${
                        activity.status === "done" ? "border-gca-green bg-gca-green" : "border-gca-border"
                      }`}
                    />
                    <div className="flex flex-col gap-[2px]">
                      <p className="text-[13px] font-medium text-gca-dark">{activity.title}</p>
                      <p className="text-[12px] text-gca-muted">{ownerName(activity.owner_id, team)}</p>
                    </div>
                  </div>
                  <p className="w-[25%] text-[13px] text-gca-dark">
                    {activity.due_date
                      ? new Date(activity.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                      : "—"}
                  </p>
                  <p
                    className={`w-[25%] text-[13px] font-semibold ${
                      isOverdue(activity) ? "text-error-text" : STATUS_STYLE[activity.status] ?? "text-gca-show"
                    }`}
                  >
                    {statusLabel(activity)}
                  </p>
                </button>
              </div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={Math.max(pages, 1)}
            perPage={perPage}
            total={total}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
            label="activities"
          />
        </>
      )}
    </div>
  );
}
