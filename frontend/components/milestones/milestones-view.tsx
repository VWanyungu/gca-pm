"use client";

import { useState } from "react";
import { ChartGantt, Plus, Search, Table, type LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useProjectTeam,
  useSidebarCounts,
} from "@/components/project-overview/use-project-data";
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
  const { data: counts } = useSidebarCounts(projectId);
  const { data: milestones = [] } = useAllMilestones(projectId);

  const [viewMode, setViewMode] = useState<ViewMode>("chart");
  const [sourceFilter, setSourceFilter] = useState<MilestoneSource | "all">("all");
  const [search, setSearch] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });
  const customCount = milestones.filter((m) => m.source === "custom").length;
  const searchedMilestones = search.trim()
    ? milestones.filter((milestone) => milestone.title.toLowerCase().includes(search.trim().toLowerCase()))
    : milestones;

  if (!project) return null;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="milestones" />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          {subView.mode === "list" && (
            <>
              <div className="flex w-full items-center justify-between">
                <div>
                  <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">Milestones</h1>
                  <p className="mt-[2px] text-[13px] text-gca-show">
                    {milestones.length} milestones · {customCount} custom
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-[12px]">
                  <SegmentedControl
                    options={[
                      { id: "chart", label: "Chart", icon: ChartGantt },
                      { id: "table", label: "Table", icon: Table },
                    ]}
                    selected={viewMode}
                    onSelect={(id) => setViewMode(id as ViewMode)}
                  />
                  <SegmentedControl
                    options={SOURCE_TABS}
                    selected={sourceFilter}
                    onSelect={(value) => {
                      setSourceFilter(value);
                      setTablePage(1);
                    }}
                  />
                  <label className="flex h-[40px] w-[240px] items-center gap-[8px] rounded-[8px] border border-gca-border bg-white px-[12px]">
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
                  {canManage && (
                    <button
                      onClick={() => setSubView({ mode: "add" })}
                      className="cursor-pointer flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
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
      </div>
    </div>
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
                ? "bg-white font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
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
