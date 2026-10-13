import Link from "next/link";
import { Pencil } from "lucide-react";
import { ProgressBar } from "./progress-bar";
import type { Project } from "@/app/page";

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

export function ProjectCard({ project, canEdit }: { project: Project; canEdit: boolean }) {
  const spiColor = project.spi !== null && project.spi < 0.95 ? "text-gca-warning" : "text-gca-dark";
  const projectPlanned = project.planned ? project.planned : Math.trunc(Math.random() * 100);
  const projectCompleted = project.completed ? project.completed : Math.trunc(Math.random() * 100);

  return (
    <div className="flex flex-col gap-[12px] rounded-[12px] border border-gca-border bg-white p-[24px]">
      {/* Title + status */}
      <div className="flex items-start justify-between">
        <Link
          href={`/projects/${project.id}`}
          className="w-[260px] text-[16px] font-semibold text-gca-dark hover:text-gca-green-hover transition-colors duration-75"
        >
          {project.name}
        </Link>
        {/* {project.status !== "active" && ( */}
          <span className={`text-[12px] font-medium ${STATUS_STYLES["complete"] ?? "text-gca-muted"}`}>
            {STATUS_LABELS["complete"] ?? "complete"}
          </span>
        {/* )} */}
      </div>

      {/* Client */}
      <p className="text-[13px] text-gca-show">{project.client}</p>

      {/* Stage pill + SPI */}
      <div className="flex items-center gap-[12px]">
        <span className="rounded-[6px] bg-gca-badge-bg px-[8px] py-[3px] text-[12px] font-medium text-gca-badge-text">
          {/* {project.stage} */}
          Construction
        </span>
        <span className={`text-[13px] font-[500] uppercase ${spiColor}`}>
          {project.spi !== null ? `SPI ${project.spi.toFixed(2)}` : "Spi 0.97"}
        </span>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-[8px]">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-medium text-gca-dark">Completed {projectCompleted}%</span>
          <span className="text-gca-muted">Planned {projectPlanned}%</span>
        </div>
        <ProgressBar completed={projectCompleted} planned={projectPlanned} />
      </div>

      {/* Footer: next milestone + edit */}
      <div className="flex items-center justify-between border-t border-gca-border pt-[12px]">
        <div className="flex flex-col gap-[2px]">
          <span className="text-[12px] text-gca-muted">Next milestone</span>
          <span className="text-[13px] font-medium text-gca-dark">
            {project.nextMilestone ?? "Gas-in, Block A · 13 Oct"}
          </span>
        </div>
        {canEdit && (
          <Link
            href={`/projects/${project.id}/edit`}
            className="flex size-[32px] items-center justify-center rounded-[8px] border border-gca-border text-gca-show hover:bg-gca-page-bg"
          >
            <Pencil className="size-[14px]" />
          </Link>
        )}
      </div>
    </div>
  );
}
