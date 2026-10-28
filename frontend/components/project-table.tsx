import Link from "next/link";
import { Pencil } from "lucide-react";
import { ProgressBar } from "./progress-bar";
import type { Project } from "@/app/(app)/page";

const STATUS_STYLES: Record<string, string> = {
  active: "text-gca-green",
  complete: "text-gca-green",
  on_hold: "text-gca-warning",
  cancelled: "text-error-text",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  complete: "Complete",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

export function ProjectTable({ projects, canEdit }: { projects: Project[]; canEdit: boolean }) {
  return (
    <div className="w-full overflow-x-auto">
      <div className="">
        {/* Header */}
        <div className="flex items-center py-[8px] text-[12px] font-medium text-gca-muted">
          <span className="w-[260px] max-w-[260px] shrink-0 truncate">Project</span>
          <span className="w-[160px] max-w-[160px] shrink-0 truncate">Stage</span>
          <span className="w-[120px] max-w-[120px] shrink-0 truncate">Status</span>
          <span className="w-[80px] max-w-[80px] shrink-0 truncate">SPI</span>
          <span className="w-[200px] max-w-[200px] shrink-0 truncate">Completed</span>
          <span className="w-[212px] max-w-[212px] shrink-0 truncate">Next milestone</span>
          <span className="w-[68px] max-w-[68px] shrink-0" />
        </div>

        {/* Rows */}
        {projects.map((p) => {
          const spiColor = p.spi !== null && p.spi < 0.95 ? "text-gca-warning" : "text-gca-dark";
          return (
            <div key={p.id} className="flex items-center border-t border-gca-border py-[12px]">
              <div className="w-[260px] max-w-[260px] shrink-0 overflow-hidden pr-3">
                <Link
                  href={`/projects/${p.id}`}
                  className="block truncate text-[13px] font-medium text-gca-dark hover:underline"
                >
                  {p.name}
                </Link>
                <p className="truncate text-[12px] text-gca-muted">{p.client}</p>
              </div>
              <span className="w-[160px] max-w-[160px] shrink-0 truncate pr-3 text-[13px] text-gca-dark">
                {p.stage}
              </span>
              <span
                className={`w-[120px] max-w-[120px] shrink-0 truncate pr-3 text-[13px] font-medium ${STATUS_STYLES[p.status] ?? "text-gca-muted"}`}
              >
                {STATUS_LABELS[p.status] ?? p.status}
              </span>
              <span
                className={`w-[80px] max-w-[80px] shrink-0 truncate font-mono text-[13px] font-medium ${spiColor}`}
              >
                {p.spi !== null ? (p.completed / p.planned).toFixed(2) : "—"}
              </span>
              <div className="flex w-[200px] max-w-[200px] shrink-0 items-center gap-[8px] overflow-hidden">
                <ProgressBar completed={p.completed} planned={p.planned} width="w-[120px]" />
                <span className="font-mono text-[12px] text-gca-show">{p.completed}%</span>
              </div>
              <span className="w-[212px] max-w-[212px] shrink-0 truncate pr-3 text-[13px] text-gca-dark">
                {p.nextMilestone ?? "—"}
              </span>
              <div className="w-[68px] max-w-[68px] shrink-0">
                {canEdit && (
                  <Link
                    href={`/projects/${p.id}/edit`}
                    className="flex size-[32px] items-center justify-center rounded-[8px] border border-gca-border text-gca-show hover:bg-gca-page-bg"
                  >
                    <Pencil className="size-[14px]" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
