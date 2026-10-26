"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { useVersionChanges } from "./use-schedule-data";
import { formatLongDateTime, type ScheduleVersion, type VersionChange } from "./types";
import type { TeamMember } from "@/components/project-overview/types";

const PER_PAGE = 5;

function uploaderName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

const FILTER_LABEL: Record<VersionChange["change_type"], string> = {
  added: "Added",
  modified: "Changed",
  restored: "Restored",
};

interface VersionChangesViewProps {
  projectId: string;
  version: ScheduleVersion;
  team: TeamMember[];
  onBack: () => void;
}

export function VersionChangesView({ projectId, version, team, onBack }: VersionChangesViewProps) {
  const { data: changes = [] } = useVersionChanges(projectId, version.schedule_version_id);
  const [filter, setFilter] = useState<VersionChange["change_type"] | "all">("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(PER_PAGE);

  const counts = useMemo(() => {
    const byType = { added: 0, modified: 0, restored: 0 } as Record<VersionChange["change_type"], number>;
    for (const c of changes) byType[c.change_type]++;
    return byType;
  }, [changes]);

  const filtered = filter === "all" ? changes : changes.filter((c) => c.change_type === filter);
  const total = filtered.length;
  const pages = Math.max(Math.ceil(total / perPage), 1);
  const rows = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <button onClick={onBack} className="flex w-fit cursor-pointer items-center gap-[6px] text-[13px] font-medium text-gca-green">
        <ArrowLeft className="size-[16px]" />
        Schedule history
      </button>

      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">v{version.version_no}</h1>
          <p className="mt-[2px] text-[13px] text-gca-show">
            Uploaded {formatLongDateTime(version.uploaded_at)} by {uploaderName(version.uploaded_by, team)}
          </p>
        </div>
        <button
          disabled
          title="Downloading the original upload needs the schedule file service — coming soon"
          className="cursor-not-allowed rounded-[8px] border border-gca-border px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark opacity-50"
        >
          Download v{version.version_no} .mpp
        </button>
      </div>

      <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
        {([
          { id: "all" as const, label: `All ${changes.length}` },
          { id: "added" as const, label: `${FILTER_LABEL.added} ${counts.added}` },
          { id: "modified" as const, label: `${FILTER_LABEL.modified} ${counts.modified}` },
          { id: "restored" as const, label: `${FILTER_LABEL.restored} ${counts.restored}` },
        ]).map((opt) => (
          <button
            key={opt.id}
            onClick={() => {
              setFilter(opt.id);
              setPage(1);
            }}
            className={`cursor-pointer rounded-[6px] px-[14px] py-[7px] text-[13px] ${
              filter === opt.id
                ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                : "font-normal text-gca-show"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-[56px] text-center text-[13px] text-gca-show">No changes in this category.</p>
      ) : (
        <div className="flex w-full flex-col gap-[16px]">
          <div className="flex w-full flex-col rounded-[12px] border border-gca-border">
            <div className="flex w-full items-center gap-[10px] border-b border-gca-border bg-gca-surface px-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
              <p className="w-[40%]">Task</p>
              <p className="w-[15%]">Field</p>
              <p className="w-[30%]">Change</p>
              <p className="w-[15%]" />
            </div>
            {rows.map((c, i) => (
              <div
                key={c.task_id + c.field}
                className={`flex w-full items-center gap-[10px] px-[16px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
              >
                <p className="w-[40%] truncate text-[13px] font-medium text-gca-dark">{c.task_name}</p>
                <p className="w-[15%] text-[13px] text-gca-show">{c.field ?? "—"}</p>
                <p className="w-[30%] font-mono text-[13px] text-gca-dark">{c.change}</p>
                <p
                  className={`w-[15%] text-[13px] font-semibold ${
                    c.change_type === "added" ? "text-gca-green" : c.change_type === "modified" ? "text-gca-warning" : "text-gca-show"
                  }`}
                >
                  {FILTER_LABEL[c.change_type]}
                </p>
              </div>
            ))}
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
              label="changes"
            />
          )}
        </div>
      )}
    </div>
  );
}
