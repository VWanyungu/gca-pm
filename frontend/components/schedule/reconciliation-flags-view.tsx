"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { Pagination } from "@/components/pagination";
import { useScheduleInvalidate } from "./use-schedule-data";
import { formatShortDate, groupByTopic, type ReconciliationFlag, type ScheduleTask } from "./types";
import type { TeamMember } from "@/components/project-overview/types";

const PER_PAGE = 10;

function reporterName(userId: string | null, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name[0]}. ${member.last_name}` : "—";
}

interface ReconciliationFlagsViewProps {
  projectId: string;
  flags: ReconciliationFlag[];
  /** The full schedule task list, used only to resolve each flagged task's phase group name. */
  allTasks: ScheduleTask[];
  team: TeamMember[];
}

export function ReconciliationFlagsView({
  projectId,
  flags,
  allTasks,
  team,
}: ReconciliationFlagsViewProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const invalidate = useScheduleInvalidate(projectId);

  async function acknowledge(flagIds: string[]) {
    setSaving(true);
    const res = await api.post(`/projects/${projectId}/schedule/reconciliation-flags/acknowledge`, {
      flag_ids: flagIds,
    });
    setSaving(false);
    if (res.status !== "success") return;
    setSelected((prev) => {
      const next = new Set(prev);
      flagIds.forEach((id) => next.delete(id));
      return next;
    });
    invalidate();
  }

  const total = flags.length;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const rows = flags.slice((page - 1) * perPage, page * perPage);
  const groups = groupByTopic(rows, (f) => f.task_id, allTasks);

  function toggle(flagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const allSelected = rows.every((r) => prev.has(r.flag_id));
      const next = new Set(prev);
      rows.forEach((r) => (allSelected ? next.delete(r.flag_id) : next.add(r.flag_id)));
      return next;
    });
  }

  if (flags.length === 0) {
    return (
      <p className="py-[56px] text-center text-[13px] text-gca-show">No reconciliation flags.</p>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <p className="text-[13px] text-gca-show">
        DPR progress that disagrees with the schedule. Acknowledge once you have checked it.
      </p>

      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-[8px] bg-gca-badge-bg px-[16px] py-[10px]">
          <p className="text-[13px] font-medium text-gca-badge-text">{selected.size} selected</p>
          <button
            onClick={() => acknowledge(Array.from(selected))}
            disabled={saving}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[14px] py-[8px] text-[13px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
          >
            Acknowledge selected
          </button>
        </div>
      )}

      <div className="no-scrollbar w-full overflow-x-auto">
        <div className="flex w-full min-w-[760px] flex-col">
          <div className="flex w-full items-center gap-[10px] border-b border-gca-border py-[8px] text-[12px] font-medium text-gca-muted">
            <span className="flex w-[4%] items-center">
              <input
                type="checkbox"
                checked={rows.length > 0 && rows.every((r) => selected.has(r.flag_id))}
                onChange={toggleAllOnPage}
                aria-label="Select every flag on this page"
                className="size-[18px] shrink-0 cursor-pointer rounded-[4px] border-[1.5px] border-gca-border accent-gca-green"
              />
            </span>
            <p className="w-[31%]">Task</p>
            <p className="w-[15%]">DPR says</p>
            <p className="w-[15%]">Schedule says</p>
            <p className="w-[20%]">Reported</p>
            <p className="w-[15%]" />
          </div>

          {groups.map(({ group, items }, gi) => (
            <div key={group ?? "ungrouped"}>
              <div
                className={`bg-gca-badge-bg px-[4px] py-[8px] ${gi > 0 ? "border-t border-gca-border" : ""}`}
              >
                <p className="text-[12px] font-semibold text-gca-badge-text">{group ?? "Other"}</p>
              </div>
              {items.map((f, i) => (
                <div
                  key={f.flag_id}
                  className={`flex w-full items-center gap-[10px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
                >
                  <span className="flex w-[4%] items-center">
                    <input
                      type="checkbox"
                      checked={selected.has(f.flag_id)}
                      onChange={() => toggle(f.flag_id)}
                      aria-label={`Select flag for ${f.task_name}`}
                      className="size-[18px] shrink-0 cursor-pointer rounded-[4px] border-[1.5px] border-gca-border accent-gca-green"
                    />
                  </span>
                  <p className="w-[31%] truncate text-[13px] font-medium text-gca-dark">
                    {f.task_name}
                  </p>
                  <p className="w-[15%] font-mono text-[13px] font-semibold text-gca-warning">
                    {Math.round(Number(f.dpr_pct))}%
                  </p>
                  <p className="w-[15%] font-mono text-[13px] text-gca-dark">
                    {Math.round(Number(f.schedule_pct))}%
                  </p>
                  <p className="w-[20%] text-[13px] text-gca-show">
                    {reporterName(f.reported_by, team)} · {formatShortDate(f.reported_at)}
                  </p>
                  <div className="flex w-[15%] justify-end">
                    <button
                      onClick={() => acknowledge([f.flag_id])}
                      disabled={saving}
                      className="cursor-pointer rounded-[8px] border border-gca-border px-[12px] py-[6px] text-[13px] font-semibold text-gca-dark hover:bg-gca-page-bg disabled:opacity-50"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {pages > 1 && (
        <Pagination
          page={page}
          totalPages={pages}
          perPage={perPage}
          total={total}
          onPageChange={setPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
          label="flags"
        />
      )}
    </div>
  );
}
