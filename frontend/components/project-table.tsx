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
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center py-[8px] text-[12px] font-medium text-gca-muted">
        <span className="min-w-0 flex-1">Project</span>
        <span className="w-[170px] shrink-0">Stage</span>
        <span className="w-[130px] shrink-0">Status</span>
        <span className="w-[100px] shrink-0">SPI</span>
        <span className="w-[200px] shrink-0">Completed</span>
        <span className="w-[300px] shrink-0">Next milestone</span>
        <span className="w-[68px] shrink-0" />
      </div>

      {/* Rows */}
      {projects.map((p) => {
        const spiColor = p.spi !== null && p.spi < 0.95 ? "text-gca-warning" : "text-gca-dark";
        return (
          <div key={p.id} className="flex items-center border-t border-gca-border py-[12px]">
            <div className="min-w-0 flex-1">
              <Link
                href={`/projects/${p.id}`}
                className="text-[13px] font-medium text-gca-dark hover:underline"
              >
                {p.name}
              </Link>
              <p className="text-[12px] text-gca-muted">{p.client}</p>
            </div>
            <span className="w-[170px] shrink-0 text-[13px] text-gca-dark">{p.stage}</span>
            <span
              className={`w-[130px] shrink-0 text-[13px] font-medium ${STATUS_STYLES[p.status] ?? "text-gca-muted"}`}
            >
              {STATUS_LABELS[p.status] ?? p.status}
            </span>
            <span className={`w-[100px] shrink-0 font-mono text-[13px] font-medium ${spiColor}`}>
              {p.spi !== null ? (p.completed / p.planned).toFixed(2) : "—"}
            </span>
            <div className="flex w-[200px] shrink-0 items-center gap-[8px]">
              <ProgressBar completed={p.completed} planned={p.planned} width="w-[120px]" />
              <span className="font-mono text-[12px] text-gca-show">{p.completed}%</span>
            </div>
            <span className="w-[300px] shrink-0 text-[13px] text-gca-dark">
              {p.nextMilestone ?? "—"}
            </span>
            <div className="w-[68px] shrink-0">
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
  );
}
