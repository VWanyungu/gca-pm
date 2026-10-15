"use client";

import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { Pagination } from "@/components/pagination";
import { useRisks } from "./use-risks-data";
import { formatShortDate, ratingFromScore, statusInfo, type RiskSource, type RiskStatus } from "./types";
import { STAGE_SHORT_NAME, type StageRow, type TeamMember } from "@/components/project-overview/types";

const STAGE_FILTER_ALL = "all";
const SOURCE_FILTER_ALL = "all";
const STATUS_FILTER_ALL = "all";

const SOURCE_OPTIONS = [
  { id: SOURCE_FILTER_ALL, name: "All sources" },
  { id: "manual", name: "Manual" },
  { id: "auto_overdue_task", name: "Auto-flagged" },
];

const STATUS_OPTIONS = [
  { id: STATUS_FILTER_ALL, name: "All statuses" },
  { id: "open", name: "Open" },
  { id: "mitigated", name: "Addressed" },
  { id: "closed", name: "Closed" },
  { id: "dismissed", name: "Dismissed" },
];

function ownerName(ownerId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === ownerId);
  return member ? `${member.first_name[0]}. ${member.last_name}` : "—";
}

interface RisksTableProps {
  projectId: string;
  stages: StageRow[];
  team: TeamMember[];
  canManage: boolean;
  onAddRisk: () => void;
  onOpenRisk: (riskId: string) => void;
}

export function RisksTable({ projectId, stages, team, canManage, onAddRisk, onOpenRisk }: RisksTableProps) {
  const [stageFilter, setStageFilter] = useState(STAGE_FILTER_ALL);
  const [sourceFilter, setSourceFilter] = useState(SOURCE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(6);

  const { data } = useRisks({
    projectId,
    stageNo: stageFilter === STAGE_FILTER_ALL ? undefined : Number(stageFilter),
    source: sourceFilter === SOURCE_FILTER_ALL ? undefined : (sourceFilter as RiskSource),
    status: statusFilter === STATUS_FILTER_ALL ? undefined : (statusFilter as RiskStatus),
    page,
    limit: perPage,
  });

  const risks = data?.riskIssues ?? [];
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
        <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Risks</h1>
        {canManage && (
          <button
            onClick={onAddRisk}
            className="cursor-pointer flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
          >
            <Plus className="size-[14px]" />
            New risk
          </button>
        )}
      </div>

      <div className="flex items-center gap-[12px]">
        <Dropdown
          id="risk-filter-stage"
          data={stageOptions}
          selectedId={stageFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setStageFilter, id)}
        />
        <Dropdown
          id="risk-filter-source"
          data={SOURCE_OPTIONS}
          selectedId={sourceFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setSourceFilter, id)}
        />
        <Dropdown
          id="risk-filter-status"
          data={STATUS_OPTIONS}
          selectedId={statusFilter}
          style="h-[40px] rounded-[8px] border border-gca-border bg-white px-[13px] text-[14px] text-gca-dark"
          onSelect={(id) => changeFilter(setStatusFilter, id)}
        />
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
            <div className="flex w-full items-center gap-[10px] py-[8px] text-[12px] font-medium text-gca-muted border-b border-gca-border">
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
                  className={`cursor-pointer flex w-full items-center gap-[10px] py-[12px] text-left ${
                    i > 0 ? "border-t border-gca-border" : ""
                  }`}
                >
                  <p className="w-[32%] truncate text-[13px] font-medium text-gca-dark">{risk.title}</p>
                  <p className="w-[13%] text-[13px] text-gca-dark">
                    {risk.stage_no ? (STAGE_SHORT_NAME[risk.stage_no] ?? risk.stage_no) : "—"}
                  </p>
                  <p className={`w-[11%] text-[13px] font-semibold ${rating.className}`}>{rating.label}</p>
                  <p className="w-[16%] text-[13px] text-gca-dark">{ownerName(risk.owner_id, team)}</p>
                  <p className={`w-[16%] text-[13px] font-semibold ${status.className}`}>{status.label}</p>
                  <p className="w-[12%] text-[13px] text-gca-dark">{formatShortDate(risk.opened_at)}</p>
                </button>
              );
            })}
          </div>

          {pages > 1 && <Pagination
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
          />}
        </>
      )}
    </div>
  );
}
