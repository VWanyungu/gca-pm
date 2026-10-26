"use client";

import { useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { useScheduleVersions } from "./use-schedule-data";
import { formatLongDateTime, type ScheduleVersion } from "./types";
import type { TeamMember } from "@/components/project-overview/types";

const PER_PAGE = 5;

function uploaderName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

interface ScheduleHistoryViewProps {
  projectId: string;
  team: TeamMember[];
  canManage: boolean;
  onBack: () => void;
  onUpload: () => void;
  onViewChanges: (version: ScheduleVersion) => void;
}

export function ScheduleHistoryView({
  projectId,
  team,
  canManage,
  onBack,
  onUpload,
  onViewChanges,
}: ScheduleHistoryViewProps) {
  const { data: versions = [] } = useScheduleVersions(projectId);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);

  const total = versions.length;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const rows = versions.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-[6px] text-[13px] font-medium text-gca-green">
        <ArrowLeft className="size-[16px]" />
        Schedule
      </button>

      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Schedule history</h1>
          <p className="mt-[2px] text-[13px] text-gca-show">{total} version{total === 1 ? "" : "s"}</p>
        </div>
        {canManage && (
          <button
            onClick={onUpload}
            className="cursor-pointer flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
          >
            <Upload className="size-[14px]" />
            Upload schedule
          </button>
        )}
      </div>

      {versions.length === 0 ? (
        <p className="py-[56px] text-center text-[13px] text-gca-show">No schedule has been uploaded yet.</p>
      ) : (
        <div className="flex w-full flex-col gap-[16px]">
          <div className="flex w-full flex-col rounded-[12px] border border-gca-border">
            <div className="flex w-full items-center gap-[10px] border-b border-gca-border bg-gca-surface px-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
              <p className="w-[10%]">Version</p>
              <p className="w-[22%]">Uploaded</p>
              <p className="w-[18%]">By</p>
              <p className="w-[13%]">Tasks added</p>
              <p className="w-[13%]">Tasks changed</p>
              <p className="w-[13%]">Overdue</p>
              <p className="w-[11%]" />
            </div>
            {rows.map((v, i) => {
              return (
                <div
                  key={v.schedule_version_id}
                  className={`flex w-full items-center gap-[10px] px-[16px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
                >
                  <p className="w-[10%] text-[13px] font-semibold text-gca-dark">
                    v{v.version_no}
                    {i === 0 && page === 1 && <span className="ml-[6px] text-[11px] font-medium text-gca-green">current</span>}
                  </p>
                  <p className="w-[22%] text-[13px] text-gca-dark">{formatLongDateTime(v.uploaded_at)}</p>
                  <p className="w-[18%] text-[13px] text-gca-dark">{uploaderName(v.uploaded_by, team)}</p>
                  <p className="w-[13%] font-mono text-[13px] text-gca-dark">
                    {v.tasks_added !== null ? `+${v.tasks_added}` : "—"}
                  </p>
                  <p className="w-[13%] font-mono text-[13px] text-gca-dark">{v.tasks_modified ?? "—"}</p>
                  <p className={`w-[13%] font-mono text-[13px] ${(v.overdue_task_count ?? 0) > 0 ? "font-semibold text-error-text" : "text-gca-dark"}`}>
                    {v.overdue_task_count ?? "—"}
                  </p>
                  <div className="flex w-[11%] items-center justify-end gap-[12px] text-[13px] font-medium">
                    <button onClick={() => onViewChanges(v)} className="cursor-pointer text-gca-green hover:underline">
                      Changes
                    </button>
                    <button
                      disabled
                      title="Downloading the original upload needs the schedule file service — coming soon"
                      className="cursor-not-allowed text-gca-muted"
                    >
                      Download
                    </button>
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
              label="versions"
            />
          )}
        </div>
      )}
    </div>
  );
}
