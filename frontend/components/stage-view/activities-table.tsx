"use client";

import { useState } from "react";
import { Plus, ClipboardList, Check, Search } from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { EmptyState } from "@/components/empty-state";
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
  return (
    activity.status === "open" && !!activity.due_date && new Date(activity.due_date) < new Date()
  );
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

function buildColumns(
  team: TeamMember[],
  selected: Set<string>,
  allSelected: boolean,
  selectableCount: number,
  toggleSelected: (activityId: string) => void,
  toggleSelectAll: () => void,
): ColumnDef<StageActivity>[] {
  const sideWidth = selectableCount > 0 ? "w-[21%]" : "w-[22.5%]";
  return [
    {
      id: "select",
      header: () => (
        <span className="flex size-[16px] shrink-0 items-center justify-center">
          <button
            onClick={toggleSelectAll}
            className={`cursor-pointer flex size-[16px] items-center justify-center rounded-[4px] border-2 ${
              allSelected ? "border-gca-green bg-gca-green" : "border-gca-border"
            }`}
          >
            {allSelected && <Check className="size-[11px] text-gca-on-accent" />}
          </button>
        </span>
      ),
      cell: ({ row }) => (
        <span className="flex size-[16px] shrink-0 items-center justify-center">
          <button
            onClick={() => toggleSelected(row.original.activity_id)}
            className={`cursor-pointer flex size-[16px] items-center justify-center rounded-[4px] border-2 ${
              selected.has(row.original.activity_id) ? "border-gca-green bg-gca-green" : "border-gca-border"
            }`}
          >
            {selected.has(row.original.activity_id) && (
              <Check className="size-[11px] text-gca-on-accent" />
            )}
          </button>
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: "Activity",
      cell: ({ row }) => (
        <div className="flex w-[60%] items-center gap-[10px]">
          <div className="flex flex-col gap-[2px]">
            <p className="text-[13px] font-medium text-gca-dark">{row.original.title}</p>
            <p className="text-[12px] text-gca-muted">{ownerName(row.original.owner_id, team)}</p>
          </div>
        </div>
      ),
    },
    {
      id: "due",
      header: "Due",
      cell: ({ row }) => (
        <p className={`${sideWidth} text-[13px] text-center text-gca-dark`}>
          {row.original.due_date
            ? new Date(row.original.due_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : "—"}
        </p>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <p
          className={`${sideWidth} text-[13px] text-center font-semibold ${
            isOverdue(row.original)
              ? "text-error-text"
              : (STATUS_STYLE[row.original.status] ?? "text-gca-show")
          }`}
        >
          {statusLabel(row.original)}
        </p>
      ),
    },
  ];
}

interface ActivitiesTableProps {
  projectId: string;
  stageNo: number;
  team: TeamMember[];
  onAddActivity: () => void;
  onOpenActivity: (activityId: string) => void;
  /** Kickoff/Closure activities are predefined by admin — PMs can't add ad-hoc ones there. */
  allowAdd?: boolean;
}

export function ActivitiesTable({
  projectId,
  stageNo,
  team,
  onAddActivity,
  onOpenActivity,
  allowAdd = true,
}: ActivitiesTableProps) {
  const [tab, setTab] = useState<"all" | "open" | "done">("all");
  const [search, setSearch] = useState("");
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
  // shortcut: filters only the loaded page (no search param on the activities endpoint yet);
  // upgrade to a server-side search if activities start outgrowing one page.
  const filteredActivities = search.trim()
    ? activities.filter((a) => a.title.toLowerCase().includes(search.trim().toLowerCase()))
    : activities;
  const selectableIds = filteredActivities
    .filter((a) => a.status !== "done")
    .map((a) => a.activity_id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const columns = buildColumns(team, selected, allSelected, selectableIds.length, toggleSelected, toggleSelectAll);
  const table = useReactTable({ data: filteredActivities, columns, getCoreRowModel: getCoreRowModel() });

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
      [...selected].map((id) =>
        api.patch(`/projects/${projectId}/stage-activities/${id}`, { status: "done" }),
      ),
    );
    setMarking(false);
    setSelected(new Set());
    invalidate();
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-[2px]">
          <p className="text-[16px] font-semibold text-gca-dark">Activities</p>
          <p className="text-[13px] text-gca-show">
            {total === 0 ? "No activities yet" : `${doneCount} of ${activities.length} done`}
          </p>
        </div>
        {allowAdd && (
          <button
            onClick={onAddActivity}
            className="flex shrink-0 cursor-pointer items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
          >
            <Plus className="size-[10px]" />
            Add activity
          </button>
        )}
      </div>

      {/* Stays mounted across tab/page changes — react-query keeps the previous page's data
       *  while a new one loads, so only the table below swaps; the toolbar never flashes. */}
      <div className="flex flex-col items-stretch gap-[12px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] py-[6px] sm:w-[240px]">
          <Search className="size-[14px] shrink-0 text-gca-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search activities"
            aria-label="Search activities"
            className="min-w-0 w-full bg-transparent text-[13px] text-gca-dark outline-none placeholder:text-gca-muted"
          />
        </label>
        <div className="flex items-center gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
          {(["all", "open", "done"] as const).map((t) => (
            <button
              key={t}
              onClick={() => changeTab(t)}
              className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
                tab === t
                  ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                  : "font-normal text-gca-show"
              }`}
            >
              {t === "all" ? "All" : t === "open" ? "Open" : "Done"}
            </button>
          ))}
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={
            search.trim()
              ? `Nothing matches "${search.trim()}"`
              : tab === "all"
                ? "Plan the work for this stage"
                : tab === "open"
                  ? "No open activities"
                  : "No completed activities"
          }
          description={
            search.trim()
              ? "Try a different search term."
              : tab === "all"
                ? "Add activities with an owner and due date. They show on the overview when overdue."
                : tab === "open"
                  ? "Open activities will show up here."
                  : "Completed activities will show up here."
          }
          action={
            !search.trim() && tab === "all" && allowAdd
              ? { label: "Add activity", onClick: onAddActivity }
              : undefined
          }
        />
      ) : (
        <>
          {selected.size > 0 && (
            <div className="flex w-full flex-wrap items-center justify-between gap-[10px] rounded-[10px] bg-gca-badge-bg px-[16px] py-[10px]">
              <button
                onClick={toggleSelectAll}
                className="cursor-pointer flex items-center gap-[10px]"
              >
                <span className="flex size-[16px] items-center justify-center rounded-[4px] border-2 border-gca-green bg-gca-green">
                  <Check className="size-[11px] text-gca-on-accent" />
                </span>
                <span className="text-[13px] font-medium text-gca-badge-text">
                  {selected.size} selected
                </span>
              </button>
              <button
                onClick={markSelectedComplete}
                disabled={marking}
                className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[8px] text-[13px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
              >
                Mark {selected.size} as complete
              </button>
            </div>
          )}

          <div className="flex w-full flex-col">
            <div className="flex w-full items-center gap-[10px] py-[8px] text-[12px] font-medium text-gca-muted border-b border-gca-border">
              {(() => {
                const [selectHeader, activityHeader, dueHeader, statusHeader] = table.getFlatHeaders();
                return (
                  <>
                    {selectableIds.length > 0 &&
                      flexRender(selectHeader.column.columnDef.header, selectHeader.getContext())}
                    <p className="w-[57%]">
                      {flexRender(activityHeader.column.columnDef.header, activityHeader.getContext())}
                    </p>
                    <p className="w-[20%] text-center">
                      {flexRender(dueHeader.column.columnDef.header, dueHeader.getContext())}
                    </p>
                    <p className="w-[20%] text-center">
                      {flexRender(statusHeader.column.columnDef.header, statusHeader.getContext())}
                    </p>
                  </>
                );
              })()}
            </div>
            {table.getRowModel().rows.map((row, i) => {
              const [selectCell, activityCell, dueCell, statusCell] = row.getVisibleCells();
              return (
                <div
                  key={row.id}
                  className={`*:cursor-pointer flex w-full items-center gap-[10px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
                >
                  {flexRender(selectCell.column.columnDef.cell, selectCell.getContext())}
                  <button
                    onClick={() => onOpenActivity(row.original.activity_id)}
                    className="cursor-pointer flex flex-1 items-center text-left"
                  >
                    {flexRender(activityCell.column.columnDef.cell, activityCell.getContext())}
                    {flexRender(dueCell.column.columnDef.cell, dueCell.getContext())}
                    {flexRender(statusCell.column.columnDef.cell, statusCell.getContext())}
                  </button>
                </div>
              );
            })}
          </div>

          {pages > 1 && (
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
          )}
        </>
      )}
    </div>
  );
}
