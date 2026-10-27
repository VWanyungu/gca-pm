"use client";

import { useMemo, useState } from "react";
import { Pencil, Flag } from "lucide-react";
import { Pagination } from "@/components/pagination";
import {
  formatShortDate,
  milestoneStatus,
  sourceLabel,
  variance,
  type MilestoneRow,
  type MilestoneSource,
} from "./types";

const PER_PAGE = 8;

interface MilestonesTableProps {
  milestones: MilestoneRow[];
  sourceFilter: MilestoneSource | "all";
  canManage: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (milestoneId: string) => void;
}

export function MilestonesTable({
  milestones,
  sourceFilter,
  canManage,
  page,
  onPageChange,
  onEdit,
}: MilestonesTableProps) {
  const [perPage, setPerPage] = useState(PER_PAGE);

  const filtered = useMemo(
    () =>
      sourceFilter === "all" ? milestones : milestones.filter((m) => m.source === sourceFilter),
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
            No milestones match the current search or source filter.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col">
        <div className="hidden w-full items-center gap-[10px] border-b border-gca-border py-[8px] text-[12px] font-medium text-gca-muted md:flex">
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
              className={`flex w-full flex-col items-start gap-[4px] py-[14px] md:flex-row md:items-center md:gap-[10px] md:py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
            >
              <p className="w-full text-[15px] font-medium text-gca-dark md:w-[35%] md:truncate md:text-[13px]">
                {m.title}
              </p>
              {/* Phone: source, date, variance and status fold under the title; the edit
                  control keeps its place at the end of that line. */}
              <div className="flex w-full flex-wrap items-center gap-x-[8px] text-[12px] md:hidden">
                <span className={`font-semibold ${status.className}`}>{status.label}</span>
                <span className={`font-mono font-semibold ${v.className}`}>{v.label}</span>
                <span className="text-gca-muted">
                  {source.label} · {formatShortDate(m.planned_date ?? m.forecast_date)}
                </span>
                {canManage && m.source === "custom" && (
                  <button
                    onClick={() => onEdit(m.id)}
                    aria-label={`Edit ${m.title}`}
                    className="ml-auto flex size-[28px] cursor-pointer items-center justify-center rounded-[6px] hover:bg-gca-page-bg"
                  >
                    <Pencil className="size-[14px] text-gca-show" />
                  </button>
                )}
              </div>
              <span className="hidden md:contents">
                <p className={`w-[15%] text-[13px] font-medium ${source.className}`}>
                  {source.label}
                </p>
                <p className="w-[15%] font-mono text-[13px] text-gca-dark">
                  {formatShortDate(m.planned_date ?? m.forecast_date)}
                </p>
                <p className={`w-[12%] font-mono text-[13px] font-semibold ${v.className}`}>
                  {v.label}
                </p>
                <p className={`w-[13%] text-[13px] font-semibold ${status.className}`}>
                  {status.label}
                </p>
                <div className="flex w-[10%] justify-end">
                  {canManage && m.source === "custom" && (
                    <button
                      onClick={() => onEdit(m.id)}
                      aria-label={`Edit ${m.title}`}
                      className="cursor-pointer flex size-[28px] items-center justify-center rounded-[6px] hover:bg-gca-page-bg"
                    >
                      <Pencil className="size-[14px] text-gca-show" />
                    </button>
                  )}
                </div>
              </span>
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
          onPageChange={onPageChange}
          onPerPageChange={(n) => {
            setPerPage(n);
            onPageChange(1);
          }}
          label="milestones"
        />
      )}
    </div>
  );
}
