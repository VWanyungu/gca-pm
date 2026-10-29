"use client";

import { useState } from "react";
import { ChartGantt, Plus, Search, Table, type LucideIcon } from "lucide-react";
import { MobileFilterToggle } from "@/components/mobile-filter-toggle";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { useProjectDetail, useProjectTeam } from "@/components/project-overview/use-project-data";
import { MilestoneChart } from "./milestone-chart";
import { MilestonesTable } from "./milestones-table";
import { MilestoneForm } from "./milestone-form";
import { MilestoneDetail } from "./milestone-detail";
import { useAllMilestones, useCustomMilestone } from "./use-milestones-data";
import type { MilestoneRow, MilestoneSource } from "./types";
import type { StageRow, TeamMember } from "@/components/project-overview/types";

type ViewMode = "chart" | "table";
type SubView =
  | { mode: "list" }
  | { mode: "add" }
  | { mode: "edit"; milestoneId: string }
  | { mode: "detail"; milestoneId: string };

const SOURCE_TABS: { id: MilestoneSource | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "schedule", label: "Schedule" },
  { id: "custom", label: "Custom" },
];

export function MilestonesView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: milestones = [] } = useAllMilestones(projectId);

  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [sourceFilter, setSourceFilter] = useState<MilestoneSource | "all">("all");
  const [search, setSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });
  const customCount = milestones.filter((m) => m.source === "custom").length;
  const searchedMilestones = search.trim()
    ? milestones.filter((milestone) =>
        milestone.title.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : milestones;

  if (!project) return null;

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
      {subView.mode === "list" && (
        <>
          <div className="flex w-full flex-col gap-[16px] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
                Milestones
              </h1>
              <p className="mt-[2px] text-[13px] text-gca-show">
                {milestones.length} milestones · {customCount} custom
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-[12px] lg:justify-end">
              <SegmentedControl
                options={[
                  { id: "chart", label: "Chart", icon: ChartGantt },
                  { id: "table", label: "Table", icon: Table },
                ]}
                selected={viewMode}
                onSelect={(id) => setViewMode(id as ViewMode)}
              />
              <MobileFilterToggle>
                <SegmentedControl
                  options={SOURCE_TABS}
                  selected={sourceFilter}
                  onSelect={(value) => {
                    setSourceFilter(value);
                    setTablePage(1);
                  }}
                />
                <label className="flex h-[40px] w-full items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] sm:w-[240px]">
                  <Search className="size-[14px] shrink-0 text-gca-muted" />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setTablePage(1);
                    }}
                    placeholder="Search milestones"
                    aria-label="Search milestones"
                    className="min-w-0 w-full bg-transparent text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
                  />
                </label>
              </MobileFilterToggle>
              {canManage && (
                <button
                  onClick={() => setSubView({ mode: "add" })}
                  className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[12px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover sm:w-auto sm:py-[10px]"
                >
                  <Plus className="size-[14px]" />
                  Add milestone
                </button>
              )}
            </div>
          </div>

          {viewMode === "chart" ? (
            <MilestoneChart
              milestones={searchedMilestones}
              sourceFilter={sourceFilter}
              onSelect={(milestoneId) => setSubView({ mode: "detail", milestoneId })}
            />
          ) : (
            <MilestonesTable
              milestones={searchedMilestones}
              sourceFilter={sourceFilter}
              canManage={canManage}
              page={tablePage}
              onPageChange={setTablePage}
              onEdit={(milestoneId) => setSubView({ mode: "edit", milestoneId })}
            />
          )}
        </>
      )}

      {subView.mode === "add" && (
        <MilestoneForm
          projectId={projectId}
          stages={project.stages}
          team={team}
          onDone={() => setSubView({ mode: "list" })}
          onCancel={() => setSubView({ mode: "list" })}
        />
      )}

      {subView.mode === "edit" && (
        <EditMilestone
          projectId={projectId}
          milestoneId={subView.milestoneId}
          stages={project.stages}
          team={team}
          onDone={() => setSubView({ mode: "list" })}
          onCancel={() => setSubView({ mode: "list" })}
        />
      )}

      {subView.mode === "detail" && (
        <MilestoneDetailById
          projectId={projectId}
          milestoneId={subView.milestoneId}
          milestones={milestones}
          team={team}
          canManage={canManage}
          onBack={() => setSubView({ mode: "list" })}
          onEdit={() => setSubView({ mode: "edit", milestoneId: subView.milestoneId })}
        />
      )}
    </main>
  );
}

function EditMilestone({
  projectId,
  milestoneId,
  stages,
  team,
  onDone,
  onCancel,
}: {
  projectId: string;
  milestoneId: string;
  stages: StageRow[];
  team: TeamMember[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const { data: milestone } = useCustomMilestone(projectId, milestoneId);
  if (!milestone) return null;
  return (
    <MilestoneForm
      projectId={projectId}
      stages={stages}
      team={team}
      editing={milestone}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}

function MilestoneDetailById({
  projectId,
  milestoneId,
  milestones,
  team,
  canManage,
  onBack,
  onEdit,
}: {
  projectId: string;
  milestoneId: string;
  milestones: MilestoneRow[];
  team: TeamMember[];
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}) {
  const milestone = milestones.find((m) => m.id === milestoneId);
  if (!milestone) return null;
  return (
    <MilestoneDetail
      projectId={projectId}
      milestone={milestone}
      team={team}
      canManage={canManage}
      onBack={onBack}
      onEdit={onEdit}
    />
  );
}

function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { id: T; label: string; icon?: LucideIcon }[];
  selected: T;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            title={opt.label}
            aria-label={opt.label}
            className={`cursor-pointer rounded-[6px] text-[13px] ${Icon ? "flex size-[34px] items-center justify-center" : "px-[14px] py-[7px]"} ${
              selected === opt.id
                ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                : "font-normal text-gca-show"
            }`}
          >
            {Icon ? <Icon className="size-[16px]" /> : opt.label}
          </button>
        );
      })}
    </div>
  );
}
