"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { Pagination } from "@/components/pagination";
import { useWeeklySubmissions } from "./use-weekly-submission-data";
import { formatWeekPeriod, weekNumber, type WeeklySubmissionStatus } from "./types";

const STATUS_FILTER_ALL = "all";
const STATUS_OPTIONS = [
  { id: STATUS_FILTER_ALL, name: "All status" },
  { id: "draft", name: "Draft" },
  { id: "approved", name: "Approved" },
  { id: "superseded", name: "Superseded" },
];

/** The register pages client-side once a date range is applied, so it needs every week
 *  rather than a page of them. 100 is the server's own ceiling (listWeeklySubmissionsQuerySchema).
 *  shortcut: a project with more than 100 weeks shows only its most recent 100, upgrade to a
 *  server-side week_start range filter when any project nears two years of submissions. */
const ALL_SUBMISSIONS_LIMIT = 100;

export function WeeklyRegisterTable({
  projectId,
  tab,
  setTab,
  weekStart,
}: {
  projectId: string;
  tab: string;
  setTab: (tab: "week" | "register") => void;
  weekStart: string;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Status is a server filter, but the API only matches one exact week_start — so the range
  // is applied here, which means the whole list has to come down and page client-side.
  const { data } = useWeeklySubmissions({
    projectId,
    status:
      statusFilter === STATUS_FILTER_ALL ? undefined : (statusFilter as WeeklySubmissionStatus),
    page: 1,
    limit: ALL_SUBMISSIONS_LIMIT,
  });

  const query = search.trim().toLowerCase();
  const matching = (data?.submissions ?? []).filter((s) => {
    const week = s.week_start.slice(0, 10);
    if (fromDate && week < fromDate) return false;
    if (toDate && week > toDate) return false;
    if (!query) return true;
    // "44" should find week 44, and a partial name should find who filed it.
    return (
      String(weekNumber(s.week_start)).includes(query) ||
      (s.creator_name ?? "").toLowerCase().includes(query)
    );
  });
  const total = matching.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(page, totalPages);
  const submissions = matching.slice((currentPage - 1) * perPage, currentPage * perPage);
  const hasActiveFilters = statusFilter !== STATUS_FILTER_ALL || !!fromDate || !!toDate || !!query;

  function changeFilter<T>(set: (value: T) => void, value: T) {
    set(value);
    setPage(1);
  }

  return (
    <div className="flex w-full flex-col gap-[20px]">
      {/* <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">Weekly register</h1>
        <p className="mt-[2px] text-[13px] text-gca-show">Submitted weeks for this project</p>
      </div> */}

      <div className="flex w-fit gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
        <button
          onClick={() => setTab("week")}
          className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
            tab === "week"
              ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
              : "font-normal text-gca-show"
          }`}
        >
          Week {weekNumber(weekStart)}
        </button>
        <button
          onClick={() => setTab("register")}
          className={`cursor-pointer rounded-[6px] px-[12px] py-[6px] text-[13px] ${
            tab === "register"
              ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
              : "font-normal text-gca-show"
          }`}
        >
          Register
        </button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">
            Weekly register
          </h1>
          <p className="mt-[2px] text-[13px] text-gca-show">Submitted weeks for this project</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-[12px]">
        <label className="flex h-[40px] w-[260px] items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px]">
          <Search className="size-[14px] shrink-0 text-gca-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => changeFilter(setSearch, event.target.value)}
            placeholder="Search week or submitted by"
            aria-label="Search week or submitted by"
            className="min-w-0 w-full bg-transparent text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
          />
        </label>
        <Dropdown
          id="register-filter-status"
          data={STATUS_OPTIONS}
          selectedId={statusFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setStatusFilter, id)}
        />
        <label className="flex h-[40px] items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[13px]">
          <span className="text-[13px] text-gca-muted">From</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value);
              setToDate(event.target.value);
              setPage(1);
            }}
            className="bg-transparent text-[14px] text-gca-dark outline-none"
          />
        </label>
        <label className="flex h-[40px] items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[13px]">
          <span className="text-[13px] text-gca-muted">To</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => changeFilter(setToDate, event.target.value)}
            className="bg-transparent text-[14px] text-gca-dark outline-none"
          />
        </label>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              changeFilter(setStatusFilter, STATUS_FILTER_ALL);
              setSearch("");
              setFromDate("");
              setToDate("");
            }}
            className="cursor-pointer text-[13px] font-medium text-gca-green"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="w-full">
        <div className="grid grid-cols-5 gap-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
          <span>Week</span>
          <span>Period</span>
          <span>Submitted by</span>
          <span>Status</span>
          <span />
        </div>
        {submissions.length === 0 ? (
          <p className="py-[24px] text-[13px] text-gca-muted">
            {hasActiveFilters ? "No weeks match these filters." : "No weeks submitted yet."}
          </p>
        ) : (
          submissions.map((s) => (
            <div
              key={s.submission_id}
              className="grid grid-cols-5 items-center gap-[16px] border-t border-gca-border py-[12px] text-[13px] text-gca-dark"
            >
              <span className="font-mono font-medium">{weekNumber(s.week_start)}</span>
              <span>{formatWeekPeriod(s.week_start)}</span>
              <span>{s.creator_name ?? "—"}</span>
              <span className="capitalize">{s.status}</span>
              <Link
                href={`/projects/${projectId}/weekly-submission/${s.submission_id}`}
                className="justify-self-end text-[13px] font-medium text-gca-green"
              >
                View
              </Link>
            </div>
          ))
        )}
      </div>

      {total > 0 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          perPage={perPage}
          total={total}
          onPageChange={setPage}
          onPerPageChange={(n) => {
            setPerPage(n);
            setPage(1);
          }}
          label="weeks"
        />
      )}
    </div>
  );
}
