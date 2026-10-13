"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LayoutGrid, List, Plus, FolderOpen, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { canAccess, CAN_CREATE_PROJECT } from "@/lib/access-control";
import { TopBar } from "@/components/top-bar";
import { ProjectCard } from "@/components/project-card";
import { ProjectTable } from "@/components/project-table";
import { Pagination } from "@/components/pagination";

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
  rows: Array<{
    project_id: string;
    project_name: string;
    client_name: string | null;
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

function mapProject(row: ProjectsResponse["rows"][number]): Project {
  return {
    id: row.project_id,
    name: row.project_name,
    client: row.client_name ?? "—",
    stage: row.current_stage_name ?? "—",
    status: row.status,
    spi: row.spi,
    completed: row.completed_pct ?? 0,
    planned: row.planned_pct ?? 0,
    nextMilestone: row.next_milestone,
  };
}

export default function Home() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [perPage] = useState(6);
  const [view, setView] = useState<"card" | "table">("card");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const showCreate = canAccess(user?.role, CAN_CREATE_PROJECT);
  // shortcut: edit check is global-only for now, upgrade to per-project when project-scoped roles are loaded
  const canEdit = canAccess(user?.role, [
    { role: "Admin", scopeType: "global" },
    { role: "ExCo", scopeType: "global" },
    { role: "PM", scopeType: "global" },
  ]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(perPage) });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    const res = await api.get<ProjectsResponse>(`/projects?${params}`);
    if (res.status === "success" && res.data) {
      setProjects(res.data.rows.map(mapProject));
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } else {
      setError(res.message);
    }
    setLoading(false);
  }, [page, perPage, search, statusFilter]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log(user)
      // router.replace("/login")
    };
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) fetchProjects();
  }, [isAuthenticated, fetchProjects]);

  if (authLoading || !isAuthenticated) return null;

  const greeting = getGreeting(user?.email);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <TopBar />
      <main className="flex flex-col gap-[32px] px-[120px] pb-[48px] pt-[40px]">
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-gca-dark">{greeting}</h1>
            {!loading && total > 0 && (
              <p className="mt-[4px] text-[14px] text-gca-muted">
                {total} project{total !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {showCreate && (
            <Link
              href="/projects/new"
              className="flex items-center justify-center rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
            >
              New project
            </Link>
          )}
        </div>

        {/* Loading state */}
        {loading && <LoadingSkeleton />}

        {/* Empty state */}
        {!loading && !error && projects.length === 0 && !search && !statusFilter && (
          <EmptyState showCreate={showCreate} />
        )}

        {/* Content */}
        {!loading && !error && projects.length > 0 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              {/* Search */}
              <div className="flex w-[360px] items-center gap-[10px] rounded-[8px] border border-gca-border bg-white px-[12px] py-[11px]">
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

              <div className="flex items-center gap-[8px]">
                {/* View switch */}
                <div className="flex gap-[4px] rounded-[10px] bg-gca-page-bg p-[4px]">
                  <button
                    onClick={() => setView("card")}
                    className={`flex h-[32px] w-[36px] items-center justify-center rounded-[6px] ${
                      view === "card"
                        ? "bg-white shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)]"
                        : ""
                    }`}
                  >
                    <LayoutGrid className="size-[16px] text-gca-dark" />
                  </button>
                  <button
                    onClick={() => setView("table")}
                    className={`flex h-[32px] w-[36px] items-center justify-center rounded-[6px] ${
                      view === "table"
                        ? "bg-white shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)]"
                        : ""
                    }`}
                  >
                    <List className="size-[16px] text-gca-dark" />
                  </button>
                </div>

                {/* Status filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-[44px] w-[170px] appearance-none rounded-[8px] border border-gca-border bg-white px-[12px] pr-[32px] text-[14px] text-gca-dark outline-none"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="complete">Complete</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-[12px] top-1/2 size-[10px] -translate-y-1/2 text-gca-dark" />
                </div>
              </div>
            </div>

            {/* Card or table view */}
            {view === "card" ? (
              <div className="grid grid-cols-3 gap-[20px]">
                {projects.map((p) => (
                  <ProjectCard key={p.id} project={p} canEdit={canEdit} />
                ))}
              </div>
            ) : (
              <ProjectTable projects={projects} canEdit={canEdit} />
            )}

            {/* Pagination */}
            {totalPages > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
              />
            )}
          </>
        )}

        {/* No results from search */}
        {!loading && !error && projects.length === 0 && (search || statusFilter) && (
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

        {/* Error */}
        {error && (
          <div className="rounded-[8px] bg-error-bg px-[14px] py-[12px] text-[14px] font-medium text-error-text">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

function getGreeting(email: string | undefined): string {
  const hour = new Date().getHours();
  const name = email?.split("@")[0]?.split(".").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") ?? "";
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${timeOfDay}${name ? `, ${name.split(" ")[0]}` : ""}`;
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
          className="flex items-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
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
      <div className="flex items-center justify-between">
        <div className="h-[44px] w-[360px] animate-pulse rounded-[8px] bg-gca-page-bg" />
        <div className="flex items-center gap-[8px]">
          <div className="h-[40px] w-[80px] animate-pulse rounded-[10px] bg-gca-page-bg" />
          <div className="h-[44px] w-[170px] animate-pulse rounded-[8px] bg-gca-page-bg" />
          <div className="h-[44px] w-[190px] animate-pulse rounded-[8px] bg-gca-page-bg" />
        </div>
      </div>
      {/* Card skeletons */}
      <div className="grid grid-cols-3 gap-[20px]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[16px] rounded-[12px] border border-gca-border p-[24px]">
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
