"use client";

import { useState } from "react";
import { Plus, GitPullRequest, Search } from "lucide-react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Dropdown from "@/components/Dropdown";
import { MobileFilterToggle } from "@/components/mobile-filter-toggle";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination";
import { useChangeRequests } from "./use-change-requests-data";
import {
  TYPE_LABEL,
  formatCostImpact,
  formatScheduleImpact,
  formatShortDate,
  statusInfo,
  type ChangeRequest,
  type ChangeRequestStatus,
  type ChangeRequestType,
} from "./types";
import { STAGE_SHORT_NAME, type StageRow } from "@/components/project-overview/types";

const STAGE_FILTER_ALL = "all";
const TYPE_FILTER_ALL = "all";
const STATUS_FILTER_ALL = "all";

const TYPE_OPTIONS = [
  { id: TYPE_FILTER_ALL, name: "All types" },
  { id: "scope", name: "Scope" },
  { id: "schedule", name: "Schedule" },
  { id: "cost", name: "Cost" },
];

const STATUS_OPTIONS = [
  { id: STATUS_FILTER_ALL, name: "All status" },
  { id: "pending", name: "Awaiting ExCo" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
  { id: "withdrawn", name: "Withdrawn" },
];

function buildColumns(): ColumnDef<ChangeRequest>[] {
  return [
    {
      accessorKey: "title",
      header: "Change request",
      meta: { className: "w-full min-w-0 md:w-[28%]" },
      cell: ({ row }) => {
        const cr = row.original;
        const status = statusInfo(cr.status);
        return (
          <div className="flex w-full flex-col gap-[4px]">
            <div>
              <p className="text-[15px] font-medium text-gca-dark md:truncate md:text-[13px]">
                {cr.title}
              </p>
              <p className="truncate text-[12px] text-gca-muted">
                {cr.stage_no ? (STAGE_SHORT_NAME[cr.stage_no] ?? cr.stage_no) : "—"}
              </p>
            </div>
            {/* Phone: type, impacts and status fold into one line under the title. */}
            <p className="flex flex-wrap items-center gap-x-[8px] text-[12px] md:hidden">
              <span className={`font-semibold ${status.className}`}>{status.label}</span>
              <span className="text-gca-muted">
                {TYPE_LABEL[cr.type]} · {formatScheduleImpact(cr.schedule_impact_days)} ·{" "}
                {formatCostImpact(cr.cost_impact, cr.cost_currency)} ·{" "}
                {formatShortDate(cr.raised_at)}
              </span>
            </p>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "Type",
      meta: { className: "hidden md:block md:w-[12%]" },
      cell: ({ row }) => <p className="text-[13px] text-gca-dark">{TYPE_LABEL[row.original.type]}</p>,
    },
    {
      id: "schedule",
      header: "Schedule",
      meta: { className: "hidden md:block md:w-[14%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">
          {formatScheduleImpact(row.original.schedule_impact_days)}
        </p>
      ),
    },
    {
      id: "cost",
      header: "Cost",
      meta: { className: "hidden md:block md:w-[14%]" },
      cell: ({ row }) => (
        <p className="font-mono text-[13px] text-gca-dark">
          {formatCostImpact(row.original.cost_impact, row.original.cost_currency)}
        </p>
      ),
    },
    {
      id: "raised",
      header: "Raised",
      meta: { className: "hidden md:block md:w-[14%]" },
      cell: ({ row }) => <p className="text-[13px] text-gca-dark">{formatShortDate(row.original.raised_at)}</p>,
    },
    {
      id: "status",
      header: "Status",
      meta: { className: "hidden md:block md:w-[18%]" },
      cell: ({ row }) => {
        const status = statusInfo(row.original.status);
        return <p className={`text-[13px] font-semibold ${status.className}`}>{status.label}</p>;
      },
    },
  ];
}

interface ChangeRequestsTableProps {
  projectId: string;
  stages: StageRow[];
  canRaise: boolean;
  onRaise: () => void;
  onOpen: (changeId: string) => void;
}

export function ChangeRequestsTable({
  projectId,
  stages,
  canRaise,
  onRaise,
  onOpen,
}: ChangeRequestsTableProps) {
  const [stageFilter, setStageFilter] = useState(STAGE_FILTER_ALL);
  const [typeFilter, setTypeFilter] = useState(TYPE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);

  const { data } = useChangeRequests({
    projectId,
    stageNo: stageFilter === STAGE_FILTER_ALL ? undefined : Number(stageFilter),
    type: typeFilter === TYPE_FILTER_ALL ? undefined : (typeFilter as ChangeRequestType),
    status: statusFilter === STATUS_FILTER_ALL ? undefined : (statusFilter as ChangeRequestStatus),
    search: debouncedSearch,
    page,
    limit: perPage,
  });

  const changeRequests = data?.changeRequests ?? [];
  const total = data?.pagination.total ?? 0;
  const pages = data?.pagination.pages ?? 1;

  const columns = buildColumns();
  const table = useReactTable({ data: changeRequests, columns, getCoreRowModel: getCoreRowModel() });

  const stageOptions = [
    { id: STAGE_FILTER_ALL, name: "All stages" },
    ...stages
      .filter((s) => s.in_scope)
      .map((s) => ({ id: String(s.stage_no), name: STAGE_SHORT_NAME[s.stage_no] ?? s.stage_name })),
  ];

  function changeFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
            Change requests
          </h1>
          <p className="mt-[4px] text-[14px] text-gca-show">
            Raise, review and track scope, schedule and cost changes.
          </p>
        </div>
        {canRaise && (
          <button
            onClick={onRaise}
            className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[12px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover sm:w-auto sm:py-[10px]"
          >
            <Plus className="size-[14px]" />
            Raise change request
          </button>
        )}
      </div>

      <div className="flex flex-col items-stretch gap-[12px] sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex h-[40px] w-full items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] sm:w-[260px]">
          <Search className="size-[14px] shrink-0 text-gca-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search change requests"
            aria-label="Search change requests"
            className="min-w-0 w-full bg-transparent text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
          />
        </label>
        <MobileFilterToggle>
          <Dropdown
            id="cr-filter-stage"
            data={stageOptions}
            selectedId={stageFilter}
            style="h-[40px] w-full sm:w-auto rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
            onSelect={(id) => changeFilter(setStageFilter, id)}
          />
          <Dropdown
            id="cr-filter-type"
            data={TYPE_OPTIONS}
            selectedId={typeFilter}
            style="h-[40px] w-full sm:w-auto rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
            onSelect={(id) => changeFilter(setTypeFilter, id)}
          />
          <Dropdown
            id="cr-filter-status"
            data={STATUS_OPTIONS}
            selectedId={statusFilter}
            style="h-[40px] w-full sm:w-auto rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
            onSelect={(id) => changeFilter(setStatusFilter, id)}
          />
        </MobileFilterToggle>
      </div>

      {changeRequests.length === 0 ? (
        <div className="flex flex-col items-center gap-[16px] py-[56px]">
          <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
            <GitPullRequest className="size-[18px] text-gca-green" />
          </span>
          <div className="flex flex-col items-center gap-[4px] text-center">
            <p className="text-[14px] font-semibold text-gca-dark">Nothing here</p>
            <p className="max-w-[420px] text-[13px] text-gca-show">
              Change requests matching these filters will show up here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col">
            <div className="hidden w-full items-center gap-[10px] border-b border-gca-border py-[8px] text-[12px] font-medium text-gca-muted md:flex">
              {table.getFlatHeaders().map((header) => (
                <p key={header.id} className={(header.column.columnDef.meta as { className?: string } | undefined)?.className}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </p>
              ))}
            </div>
            {table.getRowModel().rows.map((row, i) => (
              <button
                key={row.id}
                onClick={() => onOpen(row.original.change_id)}
                className={`flex w-full cursor-pointer flex-col items-start gap-[4px] py-[14px] text-left md:flex-row md:items-center md:gap-[10px] md:py-[12px] ${
                  i > 0 ? "border-t border-gca-border" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <span
                    key={cell.id}
                    className={(cell.column.columnDef.meta as { className?: string } | undefined)?.className}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </span>
                ))}
              </button>
            ))}
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
              label="requests"
            />
          )}
        </>
      )}
    </div>
  );
}
