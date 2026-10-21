"use client";

import { useState } from "react";
import { Plus, GitPullRequest, Search } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination";
import { useChangeRequests } from "./use-change-requests-data";
import {
  TYPE_LABEL,
  formatCostImpact,
  formatScheduleImpact,
  formatShortDate,
  statusInfo,
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
  { id: "noted", name: "Noted (FYI)" },
];

interface ChangeRequestsTableProps {
  projectId: string;
  stages: StageRow[];
  canRaise: boolean;
  onRaise: () => void;
  onOpen: (changeId: string) => void;
}

export function ChangeRequestsTable({ projectId, stages, canRaise, onRaise, onOpen }: ChangeRequestsTableProps) {
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
      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Change requests</h1>
          <p className="mt-[4px] text-[14px] text-gca-show">
            Raise, review and track scope, schedule and cost changes.
          </p>
        </div>
        {canRaise && (
          <button
            onClick={onRaise}
            className="cursor-pointer flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
          >
            <Plus className="size-[14px]" />
            Raise change request
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <label className="flex h-[40px] w-[260px] items-center gap-[8px] rounded-[8px] border border-gca-border bg-white px-[12px]">
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
        <Dropdown
          id="cr-filter-stage"
          data={stageOptions}
          selectedId={stageFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setStageFilter, id)}
        />
        <Dropdown
          id="cr-filter-type"
          data={TYPE_OPTIONS}
          selectedId={typeFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setTypeFilter, id)}
        />
        <Dropdown
          id="cr-filter-status"
          data={STATUS_OPTIONS}
          selectedId={statusFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setStatusFilter, id)}
        />
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
            <div className="flex w-full items-center gap-[10px] py-[8px] text-[12px] font-medium text-gca-muted border-b border-gca-border">
              <p className="w-[28%]">Change request</p>
              <p className="w-[12%]">Type</p>
              <p className="w-[14%]">Schedule</p>
              <p className="w-[14%]">Cost</p>
              <p className="w-[14%]">Raised</p>
              <p className="w-[18%]">Status</p>
            </div>
            {changeRequests.map((cr, i) => {
              const status = statusInfo(cr.status);
              return (
                <button
                  key={cr.change_id}
                  onClick={() => onOpen(cr.change_id)}
                  className={`cursor-pointer flex w-full items-center gap-[10px] py-[12px] text-left ${
                    i > 0 ? "border-t border-gca-border" : ""
                  }`}
                >
                  <div className="w-[28%] min-w-0">
                    <p className="truncate text-[13px] font-medium text-gca-dark">{cr.title}</p>
                    <p className="truncate text-[12px] text-gca-muted">
                      {cr.stage_no ? (STAGE_SHORT_NAME[cr.stage_no] ?? cr.stage_no) : "—"}
                    </p>
                  </div>
                  <p className="w-[12%] text-[13px] text-gca-dark">{TYPE_LABEL[cr.type]}</p>
                  <p className="w-[14%] font-mono text-[13px] text-gca-dark">
                    {formatScheduleImpact(cr.schedule_impact_days)}
                  </p>
                  <p className="w-[14%] font-mono text-[13px] text-gca-dark">
                    {formatCostImpact(cr.cost_impact, cr.cost_currency)}
                  </p>
                  <p className="w-[14%] text-[13px] text-gca-dark">{formatShortDate(cr.raised_at)}</p>
                  <p className={`w-[18%] text-[13px] font-semibold ${status.className}`}>{status.label}</p>
                </button>
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
              label="requests"
            />
          )}
        </>
      )}
    </div>
  );
}
