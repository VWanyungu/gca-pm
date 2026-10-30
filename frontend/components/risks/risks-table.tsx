"use client";

import { useState } from "react";
import { Plus, Search, ShieldCheck } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { MobileFilterToggle } from "@/components/mobile-filter-toggle";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Pagination } from "@/components/pagination";
import { useRisks } from "./use-risks-data";
import {
  formatShortDate,
  ratingFromScore,
  statusInfo,
  type RiskRating,
  type RiskStatus,
} from "./types";
import { STAGE_SHORT_NAME, type TeamMember } from "@/components/project-overview/types";

const STATUS_FILTER_ALL = "all";
const RATING_FILTER_ALL = "all";

const STATUS_OPTIONS = [
  { id: STATUS_FILTER_ALL, name: "All statuses" },
  { id: "open", name: "Open" },
  { id: "closed", name: "Closed" },
];

const RATING_OPTIONS = [
  { id: RATING_FILTER_ALL, name: "All ratings" },
  { id: "high", name: "High" },
  { id: "medium", name: "Medium" },
  { id: "low", name: "Low" },
];

function ownerName(ownerId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === ownerId);
  return member ? `${member.first_name[0]}. ${member.last_name}` : "—";
}

interface RisksTableProps {
  projectId: string;
  team: TeamMember[];
  canManage: boolean;
  onAddRisk: () => void;
  onOpenRisk: (riskId: string) => void;
}

export function RisksTable({ projectId, team, canManage, onAddRisk, onOpenRisk }: RisksTableProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState(RATING_FILTER_ALL);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);

  const { data } = useRisks({
    projectId,
    status: statusFilter === STATUS_FILTER_ALL ? undefined : (statusFilter as RiskStatus),
    rating: ratingFilter === RATING_FILTER_ALL ? undefined : (ratingFilter as RiskRating),
    search: debouncedSearch,
    page,
    limit: perPage,
  });

  const risks = data?.riskIssues ?? [];
  const total = data?.pagination.total ?? 0;
  const pages = data?.pagination.pages ?? 1;

  function changeFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="flex w-full flex-col gap-[16px]">
      <div className="flex w-full flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Risks</h1>
        {canManage && (
          <button
            onClick={onAddRisk}
            className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[12px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover sm:w-auto sm:py-[10px]"
          >
            <Plus className="size-[14px]" />
            New risk
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
            placeholder="Search risks"
            aria-label="Search risks"
            className="min-w-0 w-full bg-transparent text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
          />
        </label>
        <MobileFilterToggle>
          <Dropdown
            id="risk-filter-status"
            data={STATUS_OPTIONS}
            selectedId={statusFilter}
            style="h-[40px] w-full sm:w-auto rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
            onSelect={(id) => changeFilter(setStatusFilter, id)}
          />
          <Dropdown
            id="risk-filter-rating"
            data={RATING_OPTIONS}
            selectedId={ratingFilter}
            style="h-[40px] w-full sm:w-auto rounded-[8px] border border-gca-border bg-gca-surface px-[13px] text-[14px] text-gca-dark"
            onSelect={(id) => changeFilter(setRatingFilter, id)}
          />
        </MobileFilterToggle>
      </div>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center gap-[16px] py-[56px]">
          <span className="flex size-[40px] items-center justify-center rounded-[10px] bg-gca-page-bg">
            <ShieldCheck className="size-[18px] text-gca-green" />
          </span>
          <div className="flex flex-col items-center gap-[4px] text-center">
            <p className="text-[14px] font-semibold text-gca-dark">Nothing here</p>
            <p className="max-w-[420px] text-[13px] text-gca-show">
              Risks and issues matching these filters will show up here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col">
            <div className="hidden w-full items-center gap-[10px] border-b border-gca-border py-[8px] text-[12px] font-medium text-gca-muted md:flex">
              <p className="w-[32%]">Risk</p>
              <p className="w-[13%]">Stage</p>
              <p className="w-[11%]">Rating</p>
              <p className="w-[16%]">Owner</p>
              <p className="w-[16%]">Status</p>
              <p className="w-[12%]">Raised</p>
            </div>
            {risks.map((risk, i) => {
              const rating = ratingFromScore(risk.score);
              const status = statusInfo(risk);
              return (
                <button
                  key={risk.risk_id}
                  onClick={() => onOpenRisk(risk.risk_id)}
                  className={`flex w-full cursor-pointer flex-col items-start gap-[4px] py-[14px] text-left md:flex-row md:items-center md:gap-[10px] md:py-[12px] ${
                    i > 0 ? "border-t border-gca-border" : ""
                  }`}
                >
                  {/* Phone: title on its own line, the five attributes fold under it. */}
                  <p className="w-full text-[15px] font-medium text-gca-dark md:w-[32%] md:truncate md:text-[13px]">
                    {risk.title}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-[8px] text-[12px] md:hidden">
                    <span className={`font-semibold ${rating.className}`}>{rating.label}</span>
                    <span className={`font-semibold ${status.className}`}>{status.label}</span>
                    <span className="text-gca-muted">
                      {risk.stage_no ? (STAGE_SHORT_NAME[risk.stage_no] ?? risk.stage_no) : "—"} ·{" "}
                      {ownerName(risk.owner_id, team)} · {formatShortDate(risk.opened_at)}
                    </span>
                  </p>
                  <span className="hidden md:contents">
                    <p className="w-[13%] text-[13px] text-gca-dark">
                      {risk.stage_no ? (STAGE_SHORT_NAME[risk.stage_no] ?? risk.stage_no) : "—"}
                    </p>
                    <p className={`w-[11%] text-[13px] font-semibold ${rating.className}`}>
                      {rating.label}
                    </p>
                    <p className="w-[16%] text-[13px] text-gca-dark">
                      {ownerName(risk.owner_id, team)}
                    </p>
                    <p className={`w-[16%] text-[13px] font-semibold ${status.className}`}>
                      {status.label}
                    </p>
                    <p className="w-[12%] text-[13px] text-gca-dark">
                      {formatShortDate(risk.opened_at)}
                    </p>
                  </span>
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
              label="risks"
            />
          )}
        </>
      )}
    </div>
  );
}
