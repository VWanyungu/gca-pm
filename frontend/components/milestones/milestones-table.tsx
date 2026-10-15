"use client";

import { useMemo, useState } from "react";
import { Pencil, Flag } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { formatShortDate, milestoneStatus, sourceLabel, variance, type MilestoneRow, type MilestoneSource } from "./types";

const PER_PAGE = 8;

interface MilestonesTableProps {
  milestones: MilestoneRow[];
  sourceFilter: MilestoneSource | "all";
  canManage: boolean;
  onEdit: (milestoneId: string) => void;
}

export function MilestonesTable({ milestones, sourceFilter, canManage, onEdit }: MilestonesTableProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);

  const filtered = useMemo(
    () => (sourceFilter === "all" ? milestones : milestones.filter((m) => m.source === sourceFilter)),
    [milestones, sourceFilter],
  );

  const total = filtered.length;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  if (milestones.length === 0) {
    return (
      <div className="flex flex-col items-center gap-[16px] py-[56px]">
        <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
          <Flag className="size-[18px] text-gca-green" />
        </span>
        <div className="flex flex-col items-center gap-[4px] text-center">
          <p className="text-[14px] font-semibold text-gca-dark">Nothing here</p>
          <p className="max-w-[420px] text-[13px] text-gca-show">
            Schedule and custom milestones for this project will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center gap-[10px] py-[8px] text-[12px] font-medium text-gca-muted border-b border-gca-border">
          <p className="w-[35%]">Milestone</p>
          <p className="w-[15%]">Source</p>
          <p className="w-[15%]">Date</p>
          <p className="w-[12%]">Variance</p>
          <p className="w-[13%]">Status</p>
          <p className="w-[10%]" />
        </div>
        {rows.map((m, i) => {
          const status = milestoneStatus(m);
          const source = sourceLabel(m.source);
          const v = variance(m.slippage_days);
          return (
            <div
              key={m.id}
              className={`flex w-full items-center gap-[10px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
            >
              <p className="w-[35%] truncate text-[13px] font-medium text-gca-dark">{m.title}</p>
              <p className={`w-[15%] text-[13px] font-medium ${source.className}`}>{source.label}</p>
              <p className="w-[15%] font-mono text-[13px] text-gca-dark">{formatShortDate(m.planned_date)}</p>
              <p className={`w-[12%] font-mono text-[13px] font-semibold ${v.className}`}>{v.label}</p>
              <p className={`w-[13%] text-[13px] font-semibold ${status.className}`}>{status.label}</p>
              <div className="flex w-[10%] justify-end">
                {canManage && m.source === "custom" && (
                  <button
                    onClick={() => onEdit(m.id)}
                    className="cursor-pointer flex size-[28px] items-center justify-center rounded-[6px] hover:bg-gca-page-bg"
                  >
                    <Pencil className="size-[14px] text-gca-show" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
          label="milestones"
        />
      )}
    </div>
  );
}
