"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Camera, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import {
  canAccess,
  hasAnyRole,
  CAN_LIST_PROJECTS,
  CAN_LIST_PROJECTS_GLOBAL_ONLY,
} from "@/lib/access-control";
import { useEngineerProjectSummaries } from "@/components/engineer-dpr/use-dpr-wizard-data";
import type { RoleGrant, RoleName, ScopeType } from "@/contexts/auth-context";

const ROLE_LABELS: Record<RoleName, string> = {
  PM: "Project Manager",
  Planner: "Planner",
  SiteEngineer: "Site Engineer",
  ExCo: "ExCo",
  Admin: "Admin",
  ProjectCreator: "Project Creator",
};

const SCOPE_LABELS: Record<ScopeType, string> = {
  global: "Global",
  program: "Program",
  project: "Project",
};

const PAGE_SIZE = 5;

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  const hasProjectScope = !!user?.role.some((r) => r.scope_type === "project");
  const hasProgramScope = !!user?.role.some((r) => r.scope_type === "program");

  // A project-scoped-only Site Engineer has no GET /projects access (same gap as the home
  // page, see CAN_LIST_PROJECTS) — fall back to their own projects from their role grants.
  const canListAll =
    hasAnyRole(user?.role, CAN_LIST_PROJECTS) ||
    canAccess(user?.role, CAN_LIST_PROJECTS_GLOBAL_ONLY);
  const engineerProjects = useEngineerProjectSummaries();

  const { data: bulkProjects = [] } = useQuery({
    queryKey: ["projects", "names-for-profile"],
    queryFn: async () => {
      const res = await api.get<{ projects: { project_id: string; name: string }[] }>(
        "/projects?limit=100",
      );
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.projects;
    },
    enabled: isAuthenticated && hasProjectScope && canListAll,
  });

  const projects = canListAll ? bulkProjects : engineerProjects.data;

  const { data: programs = [] } = useQuery({
    queryKey: ["programs", "names-for-profile"],
    queryFn: async () => {
      const res = await api.get<{ programs: { program_id: number; name: string }[] }>(
        "/programs?limit=100",
      );
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.programs;
    },
    enabled: isAuthenticated && hasProgramScope,
  });

  if (isLoading || !isAuthenticated || !user) return null;

  const initials = user.email
    .split("@")[0]
    .split(".")
    .map((s) => s[0]?.toUpperCase())
    .join("")
    .slice(0, 2);

  const primaryRole = user.role[0] ? ROLE_LABELS[user.role[0].role] : "—";

  function scopeDescription(grant: RoleGrant): string {
    if (grant.scope_type === "project") {
      const name = projects.find((p) => p.project_id === grant.project_id)?.name;
      return `${name ?? "Project"} · project`;
    }
    if (grant.scope_type === "program") {
      const name = programs.find((p) => String(p.program_id) === grant.program_id)?.name;
      return `${name ?? "Program"} · program`;
    }
    return SCOPE_LABELS.global;
  }

  const totalPages = Math.max(1, Math.ceil(user.role.length / PAGE_SIZE));
  const pageRoles = user.role.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const rangeStart = user.role.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, user.role.length);

  return (
    <div className="flex min-h-[100dvh] w-full justify-center bg-gca-page-bg">
      <main className="w-full max-w-[1400px] p-[12px] sm:p-[20px] min-[1450px]:p-[40px]">
        <div className="rounded-[12px] bg-gca-surface p-[12px]">
          {/* Banner */}
          <div className="relative h-[120px] w-full rounded-[8px] bg-gradient-to-r from-[#dcebdf] via-[#a9d1b3] via-55% to-[#e8f1ea] sm:h-[200px]">
            <button className="absolute right-[12px] top-[72px] flex cursor-pointer items-center rounded-[8px] border-[1.5px] border-gca-surface bg-gca-surface/85 px-[14px] py-[8px] text-[13px] font-semibold text-gca-dark hover:bg-gca-surface sm:right-[24px] sm:top-[138px] sm:px-[18px] sm:py-[9px] sm:text-[14px]">
              Edit profile
            </button>
          </div>

          <div className="relative flex flex-wrap gap-[24px] px-[16px] pb-[24px] pt-[24px] sm:gap-[48px] sm:px-[40px] sm:pb-[40px]">
            {/* Profile picture, overlapping the banner */}
            <div className="absolute left-[16px] top-[-44px] size-[88px] sm:left-[40px] sm:top-[-64px] sm:size-[128px]">
              <div className="flex size-[88px] items-center justify-center rounded-[26px] border-[5px] border-gca-surface bg-gca-badge-bg sm:size-[128px] sm:rounded-[38px]">
                <span className="text-[28px] font-semibold tracking-[-1px] text-gca-green sm:text-[40px]">
                  {initials}
                </span>
              </div>
              <button className="absolute bottom-[-6px] right-[-6px] flex size-[34px] items-center justify-center rounded-full bg-gca-green text-gca-on-accent shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)] hover:bg-gca-green-hover cursor-pointer">
                <Camera className="size-[16px]" />
              </button>
            </div>

            {/* Identity column */}
            <div className="flex w-full shrink-0 flex-col gap-[16px] pt-[56px] sm:w-[300px] sm:pt-[76px]">
              <div className="flex flex-col gap-[4px]">
                <p className="text-[22px] font-semibold tracking-[-0.33px] text-gca-dark">
                  {user.firstName || user.email}
                </p>
                <p className="text-[14px] text-gca-show">{primaryRole}</p>
              </div>
              <p className="text-[14px] text-gca-dark">{user.email}</p>
              <div className="h-px w-full bg-gca-border sm:w-[300px]" />
              <p className="text-[12px] text-gca-muted">Member since —</p>
              <Link
                href="/notifications?tab=preferences"
                className="text-left text-[13px] font-medium text-gca-green"
              >
                Notification preferences
              </Link>
            </div>

            {/* Access column */}
            <div className="flex w-full min-w-0 flex-1 flex-col gap-[20px] sm:min-w-[320px]">
              <div className="flex flex-col items-start justify-between gap-[12px] rounded-[8px] bg-gca-page-bg px-[16px] py-[12px] md:flex-row md:items-center">
                <div className="flex items-start gap-[12px] md:items-center">
                  <MicrosoftLogo />
                  <p className="text-[14px] font-medium text-gca-dark">
                    Your profile is linked to your Microsoft account. Name and email are managed
                    there.
                  </p>
                </div>
                <button className="flex gap-[6px] items-center text-[13px] font-medium text-gca-green cursor-pointer">
                  Manage <ArrowRight className="size-[14px]" />
                </button>
              </div>

              <div className="flex flex-col gap-[4px]">
                <h2 className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">
                  My access
                </h2>
                <p className="text-[13px] text-gca-show">Only an Admin can change this.</p>
              </div>

              <div className="no-scrollbar flex flex-col overflow-x-auto">
                <div className="hidden items-center py-[8px] text-[12px] font-medium text-gca-muted lg:flex">
                  <p className="w-[200px]">Role</p>
                  <p className="w-[380px]">Scope</p>
                  <p className="w-[180px]">Granted by</p>
                  <p className="w-[204px]">Since</p>
                </div>
                {pageRoles.length === 0 && (
                  <p className="border-t border-gca-border py-[12px] text-[13px] text-gca-show">
                    No roles assigned.
                  </p>
                )}
                {pageRoles.map((grant, i) => (
                  <div
                    key={`${grant.role}-${grant.scope_type}-${grant.project_id ?? grant.program_id ?? i}`}
                    className="flex flex-col items-start gap-[2px] border-t border-gca-border py-[12px] text-[13px] text-gca-dark lg:flex-row"
                  >
                    <p className="font-medium lg:w-[200px]">{ROLE_LABELS[grant.role]}</p>
                    <p className="text-gca-muted lg:w-[380px] lg:text-gca-dark">
                      {scopeDescription(grant)}
                    </p>
                    <p className="hidden lg:block lg:w-[180px]">—</p>
                    <p className="hidden lg:block lg:w-[204px]">—</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-[12px]">
                <p className="text-[13px] text-gca-show">
                  {user.role.length === 0
                    ? "Showing 0 of 0"
                    : `Showing ${rangeStart}–${rangeEnd} of ${user.role.length}`}
                </p>
                <div className="flex items-center gap-[6px]">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex size-[32px] items-center justify-center rounded-[6px] border border-gca-border bg-gca-surface text-gca-dark disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-[14px]" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex size-[32px] items-center justify-center rounded-[6px] font-mono text-[13px] font-medium cursor-pointer ${
                        p === page
                          ? "bg-gca-green text-gca-on-accent"
                          : "border border-gca-border bg-gca-surface text-gca-dark"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex size-[32px] items-center justify-center rounded-[6px] border border-gca-border bg-gca-surface text-gca-dark disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="size-[14px]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <div className="grid size-[18px] grid-cols-2 gap-[2px]">
      <div className="bg-[#f25022]" />
      <div className="bg-[#7fba00]" />
      <div className="bg-[#00a4ef]" />
      <div className="bg-[#ffb900]" />
    </div>
  );
}
