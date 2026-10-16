"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Camera } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
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

  const { data: projects = [] } = useQuery({
    queryKey: ["projects", "names-for-profile"],
    queryFn: async () => {
      const res = await api.get<{ projects: { project_id: string; name: string }[] }>("/projects?limit=100");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.projects;
    },
    enabled: isAuthenticated && hasProjectScope,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["programs", "names-for-profile"],
    queryFn: async () => {
      const res = await api.get<{ programs: { program_id: number; name: string }[] }>("/programs?limit=100");
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
    <div className="flex w-full justify-center bg-gca-page-bg h-[100vh]">
      <main className="w-full max-w-[1400px] max-[1450px]:p-[0] max-[1450px]:pt-[20px] p-[40px]">
        <div className="rounded-[12px] bg-white p-[12px]">
          {/* Banner */}
          <div className="relative h-[200px] w-full rounded-[8px] bg-gradient-to-r from-[#dcebdf] via-[#a9d1b3] via-55% to-[#e8f1ea]">
            <button
              className="absolute right-[24px] top-[138px] flex items-center rounded-[8px] border-[1.5px] border-white bg-white/85 px-[18px] py-[9px] text-[14px] font-semibold text-gca-dark hover:bg-white cursor-pointer"
            >
              Edit profile
            </button>
          </div>

          <div className="relative flex flex-wrap gap-[48px] px-[40px] pb-[40px] pt-[24px]">
            {/* Profile picture, overlapping the banner */}
            <div className="absolute left-[40px] top-[-64px] size-[128px]">
              <div className="flex size-[128px] items-center justify-center rounded-[38px] border-[5px] border-white bg-gca-badge-bg">
                <span className="text-[40px] font-semibold tracking-[-1px] text-gca-green">{initials}</span>
              </div>
              <button
                className="absolute bottom-[-6px] right-[-6px] flex size-[34px] items-center justify-center rounded-full bg-gca-green text-white shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)] hover:bg-gca-green-hover cursor-pointer"
              >
                <Camera className="size-[16px]" />
              </button>
            </div>

            {/* Identity column */}
            <div className="flex w-[300px] shrink-0 flex-col gap-[16px] pt-[76px]">
              <div className="flex flex-col gap-[4px]">
                <p className="text-[22px] font-semibold tracking-[-0.33px] text-gca-dark">
                  {user.firstName || user.email}
                </p>
                <p className="text-[14px] text-gca-show">{primaryRole}</p>
              </div>
              <p className="text-[14px] text-gca-dark">{user.email}</p>
              <div className="h-px w-[300px] bg-gca-border" />
              <p className="text-[12px] text-gca-muted">Member since —</p>
              <button className="text-left text-[13px] font-medium text-gca-green hover:underline cursor-pointer">
                Notification preferences →
              </button>
            </div>

            {/* Access column */}
            <div className="flex min-w-[320px] flex-1 flex-col gap-[20px]">
              <div className="flex items-center justify-between rounded-[8px] bg-gca-page-bg px-[16px] py-[12px]">
                <div className="flex items-center gap-[12px]">
                  <MicrosoftLogo />
                  <p className="text-[14px] font-medium text-gca-dark">
                    Your profile is linked to your Microsoft account. Name and email are managed there.
                  </p>
                </div>
                <button className="text-[13px] font-medium text-gca-green cursor-pointer">Manage →</button>
              </div>

              <div className="flex flex-col gap-[4px]">
                <h2 className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">My access</h2>
                <p className="text-[13px] text-gca-show">Only an Admin can change this.</p>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center py-[8px] text-[12px] font-medium text-gca-muted">
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
                    className="flex items-start border-t border-gca-border py-[12px] text-[13px] text-gca-dark"
                  >
                    <p className="w-[200px] font-medium">{ROLE_LABELS[grant.role]}</p>
                    <p className="w-[380px]">{scopeDescription(grant)}</p>
                    <p className="w-[180px]">—</p>
                    <p className="w-[204px]">—</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[13px] text-gca-show">
                  {user.role.length === 0 ? "Showing 0 of 0" : `Showing ${rangeStart}–${rangeEnd} of ${user.role.length}`}
                </p>
                <div className="flex items-center gap-[6px]">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex size-[32px] items-center justify-center rounded-[6px] border border-gca-border bg-white text-gca-dark disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="size-[14px]" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`flex size-[32px] items-center justify-center rounded-[6px] font-mono text-[13px] font-medium cursor-pointer ${
                        p === page ? "bg-gca-green text-white" : "border border-gca-border bg-white text-gca-dark"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex size-[32px] items-center justify-center rounded-[6px] border border-gca-border bg-white text-gca-dark disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
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
