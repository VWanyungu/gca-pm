"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LayoutGrid, List, Plus, FolderOpen, ChevronDown } from "lucide-react";
import { MobileFilterToggle } from "@/components/mobile-filter-toggle";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import {
  canAccess,
  hasAnyRole,
  CAN_CREATE_PROJECT,
  CAN_LIST_PROJECTS,
  CAN_LIST_PROJECTS_GLOBAL_ONLY,
} from "@/lib/access-control";
import {
  useEngineerProjectSummaries,
  type EngineerProjectSummary,
} from "@/components/engineer-dpr/use-dpr-wizard-data";
import { STAGE_SHORT_NAME } from "@/components/project-overview/types";
import { ProjectCard } from "@/components/project-card";
import { ProjectTable } from "@/components/project-table";
import { Pagination } from "@/components/pagination";
import Dropdown from "@/components/Dropdown";

export interface Project {
  id: string;
  name: string;
  client: string;
  stage: string;
  status: string;
  spi: number | null;
  completed: number;
  planned: number;
  nextMilestone: string | null;
}

interface ProjectsResponse {
  projects: Array<{
    project_id: string;
    name: string;
    client_name: string | null;
    current_stage_no: number | null;
    current_stage_name: string | null;
    status: string;
    spi: number | null;
    completed_pct: number | null;
    planned_pct: number | null;
    next_milestone: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProgramsResponse {
  programs: Array<{ program_id: number; name: string; is_active: boolean }>;
}

/** Cards and table rows give the stage one line, and "Planning, Monitoring & Controls (PMC)"
 *  does not fit — so the home page shows the short label the pipeline already uses. */
function shortStage(stageNo: number | null, stageName: string | null): string {
  if (stageNo != null && STAGE_SHORT_NAME[stageNo]) return STAGE_SHORT_NAME[stageNo];
  return stageName ?? "—";
}

function mapProject(row: ProjectsResponse["projects"][number]): Project {
  return {
    id: row.project_id,
    name: row.name,
    client: row.client_name ?? "—",
    stage: shortStage(row.current_stage_no, row.current_stage_name),
    status: row.status,
    spi: row.spi ?? null,
    completed: row.completed_pct ?? 0,
    planned: row.planned_pct ?? 0,
    nextMilestone: row.next_milestone,
  };
}

function mapEngineerProject(row: EngineerProjectSummary): Project {
  return {
    id: row.project_id,
    name: row.name,
    client: row.client_name ?? "—",
    stage: shortStage(row.current_stage_no, row.current_stage_name),
    status: row.status,
    spi: row.spi,
    completed: row.completed_pct ?? 0,
    planned: row.planned_pct ?? 0,
    nextMilestone: row.next_milestone,
  };
}

/** The card grid runs four across, the table is a list — so each view gets the page size that
 *  fills it. Switching view resets the size, which the Pagination control can still override. */
const CARD_PAGE_SIZE = 8;
const TABLE_PAGE_SIZE = 20;

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(CARD_PAGE_SIZE);
  const [view, setView] = useState<"card" | "table">("card");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [programFilter, setProgramFilter] = useState("");

  const showCreate = canAccess(user?.role, CAN_CREATE_PROJECT);
  // shortcut: edit check is global-only for now, upgrade to per-project when project-scoped roles are loaded
  const canEdit = canAccess(user?.role, [
    { role: "Admin", scopeType: "global" },
    { role: "ExCo", scopeType: "global" },
    { role: "PM", scopeType: "global" },
  ]);

  // A project-scoped-only Site Engineer has no GET /projects access (canListProjects only
  // authorizes SiteEngineer@global) — fetch their own projects from their role grants instead.
  const canListAll =
    hasAnyRole(user?.role, CAN_LIST_PROJECTS) ||
    canAccess(user?.role, CAN_LIST_PROJECTS_GLOBAL_ONLY);
  const engineerProjects = useEngineerProjectSummaries();

  const { data: programs = [] } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const res = await api.get<ProgramsResponse>("/programs?limit=100");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.programs;
    },
    // Only the program filter (hidden for an engineer-only user, see canListAll) needs this.
    enabled: isAuthenticated && canListAll,
  });

  const projectProgramOptions = [
    { id: "all", name: "All programs" },
    ...programs.map((program) => ({ id: String(program.program_id), name: program.name })),
  ];

  const projectStatusOptions = [
    { id: "all", name: "All status", value: "" },
    { id: "active", name: "Active", value: "active" },
    { id: "on_hold", name: "On hold", value: "on_hold" },
    { id: "complete", name: "Complete", value: "complete" },
    { id: "cancelled", name: "Cancelled", value: "cancelled" },
  ];

  const projectsQuery = useQuery({
    queryKey: [
      "projects",
      {
        page,
        limit: perPage,
        search,
        status: statusFilter,
        programId: programFilter !== "all" ? programFilter : "",
      },
    ],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (programFilter && programFilter !== "all") params.set("program_id", programFilter);

      const res = await api.get<ProjectsResponse>(`/projects?${params}`);
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return {
        ...res.data,
        projects: res.data.projects.map(mapProject),
      };
    },
    enabled: isAuthenticated && canListAll,
  });

  const engineerProjectList = engineerProjects.data
    .map(mapEngineerProject)
    .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  const projects = canListAll ? (projectsQuery.data?.projects ?? []) : engineerProjectList;
  const total = canListAll ? (projectsQuery.data?.total ?? 0) : engineerProjectList.length;
  const totalPages = canListAll ? (projectsQuery.data?.totalPages ?? 1) : 1;
  const loading = canListAll ? projectsQuery.isLoading : engineerProjects.isLoading;
  const error = canListAll ? (projectsQuery.error?.message ?? null) : null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) return null;

  function changeView(next: "card" | "table") {
    setView(next);
    setPerPage(next === "table" ? TABLE_PAGE_SIZE : CARD_PAGE_SIZE);
    setPage(1);
  }

  const greeting = getGreeting(user?.email, user?.firstName);

  return (
    <>
      <main className="flex flex-col gap-[32px] px-4 pb-[48px] pt-[20px] sm:px-8 md:pt-[40px] lg:px-10 xl:px-[120px]">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.7px] text-gca-dark sm:text-[28px]">
              {greeting}
            </h1>
          </div>
          {showCreate && (
            <Link
              href="/projects/new"
              className="flex w-full items-center justify-center rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover sm:w-auto"
            >
              New project
            </Link>
          )}
        </div>

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Toolbar */}
            <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
              {/* Search */}
              <div className="flex w-full items-center gap-[10px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] py-[11px] lg:w-[360px]">
                <Search className="size-[14px] text-gca-muted" />
                <input
                  type="text"
                  placeholder="Search projects"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 bg-transparent text-[14px] text-gca-dark placeholder:text-gca-muted outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-[8px]">
                {/* View switch */}
                <div className="flex w-fit cursor-pointer gap-[4px] rounded-[10px] bg-gca-page-bg p-[4px]">
                  <button
                    onClick={() => changeView("card")}
                    className={`flex h-[32px] w-[36px] items-center justify-center rounded-[6px] cursor-pointer ${
                      view === "card" ? "bg-gca-surface shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)]" : ""
                    }`}
                  >
                    <LayoutGrid className="size-[16px] text-gca-dark" />
                  </button>
                  <button
                    onClick={() => changeView("table")}
                    className={`flex h-[32px] w-[36px] items-center justify-center rounded-[6px] cursor-pointer ${
                      view === "table"
                        ? "bg-gca-surface shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)]"
                        : ""
                    }`}
                  >
                    <List className="size-[16px] text-gca-dark" />
                  </button>
                </div>

                {canListAll && (
                  <MobileFilterToggle>
                    <div className="relative min-w-0">
                      <Dropdown
                        id="status-filter"
                        title="Status"
                        data={projectStatusOptions.map((status) => ({
                          id: status.id,
                          name: status.name,
                          value: status.value,
                        }))}
                        style="h-[44px] w-full appearance-none rounded-[8px] border border-gca-border bg-gca-surface px-[12px] text-[14px] text-gca-dark outline-none sm:w-[170px]"
                        selectedId={
                          projectStatusOptions.find((s) => s.value === statusFilter)?.id ?? "all"
                        }
                        onSelect={(id, name, value) => {
                          setStatusFilter(value);
                          setPage(1);
                        }}
                      />
                    </div>
                    <div className="relative min-w-0">
                      <Dropdown
                        id="program-filter"
                        title="Program"
                        data={projectProgramOptions.map((program) => ({
                          id: program.id.toString(),
                          name: program.name,
                        }))}
                        style="h-[44px] w-full appearance-none rounded-[8px] border border-gca-border bg-gca-surface px-[12px] text-[14px] text-gca-dark outline-none sm:w-[170px]"
                        selectedId={
                          projectProgramOptions.find((p) => p.id.toString() === programFilter)?.id ??
                          "all"
                        }
                        onSelect={(id) => {
                          setProgramFilter(id);
                          setPage(1);
                        }}
                      />
                    </div>
                  </MobileFilterToggle>
                )}
              </div>
            </div>

            {/* Card or table view */}
            {view === "card" ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-[20px]">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} canEdit={canEdit} />
                ))}
              </div>
            ) : (
              <ProjectTable projects={projects} canEdit={canEdit} />
            )}

            {/* No results from search */}
            {!loading &&
              !error &&
              projects.length === 0 &&
              (search || statusFilter || programFilter) && (
                <div className="flex flex-col items-center gap-[12px] py-[64px]">
                  <Search className="size-[40px] text-gca-muted" />
                  <p className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">
                    No projects found
                  </p>
                  <p className="text-center text-[14px] text-gca-show">
                    Try adjusting your search or filters.
                  </p>
                </div>
              )}

            {/* Empty state */}
            {!loading && !error && projects.length === 0 && search != "" && statusFilter != "" && (
              <EmptyState showCreate={showCreate} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
                onPerPageChange={(value) => {
                  setPerPage(value);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

function getGreeting(email: string | undefined, name: string | undefined | null): string {
  const hour = new Date().getHours();
  // const name = email?.split("@")[0]?.split(".").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") ?? "";
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${timeOfDay}, ${name ? name : ""}`;
}

function EmptyState({ showCreate }: { showCreate: boolean }) {
  return (
    <div className="flex flex-col items-center gap-[12px] py-[64px]">
      <div className="flex size-[56px] items-center justify-center rounded-full bg-gca-badge-bg">
        <FolderOpen className="size-[24px] text-gca-green" />
      </div>
      <p className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">No projects yet</p>
      <p className="w-[400px] text-center text-[14px] text-gca-show">
        Create a project to start tracking its stages, DPRs and weekly submissions.
      </p>
      {showCreate && (
        <Link
          href="/projects/new"
          className="flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
        >
          <Plus className="size-[10px]" />
          New project
        </Link>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-[12px] lg:flex-row lg:items-center lg:justify-between">
        <div className="h-[44px] w-full animate-pulse rounded-[8px] bg-gca-page-bg lg:w-[360px]" />
        <div className="grid grid-cols-2 gap-[8px] sm:flex sm:items-center">
          <div className="col-span-2 h-[40px] w-[80px] animate-pulse rounded-[10px] bg-gca-page-bg sm:col-span-auto" />
          <div className="h-[44px] w-full animate-pulse rounded-[8px] bg-gca-page-bg sm:w-[170px]" />
          <div className="h-[44px] w-full animate-pulse rounded-[8px] bg-gca-page-bg sm:w-[170px]" />
        </div>
      </div>
      {/* Card skeletons */}
      <div className="grid grid-cols-1 gap-[20px] md:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-[16px] rounded-[12px] border border-gca-border p-[24px]"
          >
            <div className="h-[20px] w-3/4 animate-pulse rounded bg-gca-page-bg" />
            <div className="h-[16px] w-1/2 animate-pulse rounded bg-gca-page-bg" />
            <div className="flex gap-[12px]">
              <div className="h-[22px] w-[80px] animate-pulse rounded-[6px] bg-gca-page-bg" />
              <div className="h-[16px] w-[60px] animate-pulse rounded bg-gca-page-bg" />
            </div>
            <div className="flex flex-col gap-[8px]">
              <div className="flex justify-between">
                <div className="h-[14px] w-[100px] animate-pulse rounded bg-gca-page-bg" />
                <div className="h-[14px] w-[80px] animate-pulse rounded bg-gca-page-bg" />
              </div>
              <div className="h-[6px] w-full animate-pulse rounded-[3px] bg-gca-page-bg" />
            </div>
            <div className="flex items-center justify-between border-t border-gca-border pt-[12px]">
              <div className="flex flex-col gap-[4px]">
                <div className="h-[12px] w-[80px] animate-pulse rounded bg-gca-page-bg" />
                <div className="h-[16px] w-[140px] animate-pulse rounded bg-gca-page-bg" />
              </div>
              <div className="size-[32px] animate-pulse rounded-[8px] bg-gca-page-bg" />
            </div>
          </div>
        ))}
      </div>
      {/* Pagination skeleton */}
      <div className="h-[60px] w-full animate-pulse rounded-[12px] border border-gca-border bg-gca-page-bg" />
    </>
  );
}
