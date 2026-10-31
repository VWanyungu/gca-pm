"use client";

import { useMemo, useState } from "react";
import { Pencil, Flag } from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
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

function buildColumns(canManage: boolean, onEdit: (milestoneId: string) => void): ColumnDef<MilestoneRow>[] {
  return [
    {
      accessorKey: "title",
      header: "Milestone",
      meta: { className: "w-full md:w-[35%]" },
      cell: ({ row }) => {
        const m = row.original;
        const status = milestoneStatus(m);
        const source = sourceLabel(m.source);
        const v = variance(m.slippage_days);
        return (
          <div className="flex w-full flex-col gap-[4px]">
            <p className="w-full text-[15px] font-medium text-gca-dark md:truncate md:text-[13px]">
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
          </div>
        );
      },
    },
    {
      id: "source",
      header: "Source",
      meta: { className: "hidden md:block md:w-[15%]" },
      cell: ({ row }) => {
        const source = sourceLabel(row.original.source);
        return <p className={`text-[13px] font-medium ${source.className}`}>{source.label}</p>;
      },
    },
    {
      id: "date",
      header: "Date",
      meta: { className: "hidden md:block md:w-[15%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">
          {formatShortDate(row.original.planned_date ?? row.original.forecast_date)}
        </p>
      ),
    },
    {
      id: "variance",
      header: "Variance",
      meta: { className: "hidden md:block md:w-[12%]" },
      cell: ({ row }) => {
        const v = variance(row.original.slippage_days);
        return <p className={`font-mono text-[13px] font-semibold ${v.className}`}>{v.label}</p>;
      },
    },
    {
      id: "status",
      header: "Status",
      meta: { className: "hidden md:block md:w-[13%]" },
      cell: ({ row }) => {
        const status = milestoneStatus(row.original);
        return <p className={`text-[13px] font-semibold ${status.className}`}>{status.label}</p>;
      },
    },
    {
      id: "edit",
      header: "",
      meta: { className: "hidden md:block md:w-[10%]" },
      cell: ({ row }) => {
        const m = row.original;
        return (
          <div className="flex justify-end">
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
        );
      },
    },
  ];
}

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

  const columns = buildColumns(canManage, onEdit);
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

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
          {table.getFlatHeaders().map((header) => (
            <p key={header.id} className={(header.column.columnDef.meta as { className?: string } | undefined)?.className}>
              {flexRender(header.column.columnDef.header, header.getContext())}
            </p>
          ))}
        </div>
        {table.getRowModel().rows.map((row, i) => (
          <div
            key={row.id}
            className={`flex w-full flex-col items-start gap-[4px] py-[14px] md:flex-row md:items-center md:gap-[10px] md:py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
          >
            {row.getVisibleCells().map((cell) => (
              <span
                key={cell.id}
                className={(cell.column.columnDef.meta as { className?: string } | undefined)?.className}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </span>
            ))}
          </div>
        ))}
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
