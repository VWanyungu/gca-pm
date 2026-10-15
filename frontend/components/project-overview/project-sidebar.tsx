"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  CalendarRange,
  Send,
  AlertTriangle,
  GitPullRequest,
  Flag,
  Users,
  ListTree,
  Settings,
  PanelLeftClose,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { STAGE_SHORT_NAME, type StageRow } from "./types";

const ROLE_BLURB: Record<string, string> = {
  PM: "Full access to this project",
  Planner: "Can edit schedule and submissions",
  SiteEngineer: "Can submit daily progress reports",
  ExCo: "Executive visibility across projects",
  Admin: "Full platform access",
  ProjectCreator: "Can create and configure projects",
};

interface ProjectSidebarProps {
  projectId: string;
  stages: StageRow[];
  counts?: { submit: number; risks: number; changeRequests: number };
  percentByStage?: Record<number, number>;
  active: "overview" | "team" | "stages" | "risks" | "change-requests" | "milestones";
  activeStageNo?: number;
}

export function ProjectSidebar({
  projectId,
  stages,
  counts,
  percentByStage,
  active,
  activeStageNo,
}: ProjectSidebarProps) {
  const { user } = useAuth();
  const [stagesOpen, setStagesOpen] = useState(true);

  const myRole = user?.role.find(
    (r) => r.scope_type === "project" && r.project_id === projectId,
  )?.role;

  const base = `/projects/${projectId}`;
  const navItems = [
    { key: "overview", label: "Overview", icon: LayoutGrid, href: base },
    { key: "schedule", label: "Schedule", icon: CalendarRange, href: `${base}/schedule` },
    {
      key: "submit",
      label: "Submit",
      icon: Send,
      href: `${base}/weekly-submission`,
      count: counts?.submit,
    },
    {
      key: "risks",
      label: "Risks",
      icon: AlertTriangle,
      href: `${base}/risks`,
      count: counts?.risks,
    },
    {
      key: "change-requests",
      label: "Change requests",
      icon: GitPullRequest,
      href: `${base}/change-requests`,
      count: counts?.changeRequests,
    },
    { key: "milestones", label: "Milestones", icon: Flag, href: `${base}/milestones` },
    { key: "team", label: "Team", icon: Users, href: `${base}/team` },
  ] as const;

  const inScopeStages = stages.filter((s) => s.in_scope).sort((a, b) => b.stage_no - a.stage_no);
  const topStages = inScopeStages.filter((s) => s.state !== "complete").slice(0, 3);

  return (
    <aside className="sticky top-[64px] flex h-[calc(100vh-64px)] w-[240px] shrink-0 flex-col justify-between overflow-y-auto border-r border-gca-border bg-gca-page-bg">
      <div className="flex flex-col gap-[2px] px-[12px] pt-[40px]">
        {myRole && (
          <div className="mb-[8px] flex flex-col gap-[2px] rounded-[10px] px-[12px] py-[10px]">
            <p className="text-[14px] font-semibold text-gca-dark">
              {myRole === "PM" ? "Main PM" : myRole === "Planner" ? "Main Planner" : myRole}
            </p>
            <p className="text-[12px] text-gca-show">{ROLE_BLURB[myRole] ?? "Project access"}</p>
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center justify-between rounded-[8px] px-[12px] py-[8px] ${
                isActive ? "bg-gca-badge-bg" : "hover:bg-white"
              }`}
            >
              <span className="flex items-center gap-[10px]">
                <Icon className={`size-[16px] ${isActive ? "text-gca-green" : "text-gca-show"}`} />
                <span
                  className={`text-[14px] ${isActive ? "font-semibold text-gca-green-hover" : "font-medium text-gca-show"}`}
                >
                  {item.label}
                </span>
              </span>
              {"count" in item && !!item.count && (
                <span className="font-mono text-[12px] text-gca-muted">{item.count}</span>
              )}
            </Link>
          );
        })}

        {/* Stages */}
        {/* <button
          onClick={() => setStagesOpen((o) => !o)}
          className="flex items-center justify-between rounded-[8px] px-[12px] py-[8px] hover:bg-white"
        >
          <span className="flex items-center gap-[10px]">
            <ListTree className="size-[16px] text-gca-show" />
            <span className="text-[14px] font-medium text-gca-show">Stages</span>
          </span>
          {stagesOpen ? (
            <ChevronDown className="size-[14px] text-gca-muted" />
          ) : (
            <ChevronRight className="size-[14px] text-gca-muted" />
          )}
        </button>

        {stagesOpen && (
          <div className="relative flex flex-col gap-[2px] py-[4px] pl-[20px]">
            <svg
              className="pointer-events-none absolute left-[20px] top-0"
              width={9}
              height={113}
              viewBox="0 0 10.4 113.4"
              fill="none"
            >
              <path d="M0.7 0.7 V105.7 C0.7 110.7 3.7 112.7 9.7 112.7" stroke="#C9D3CB" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0.7 9.7 C0.7 14.7 3.7 16.7 9.7 16.7" stroke="#C9D3CB" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0.7 41.7 C0.7 46.7 3.7 48.7 9.7 48.7" stroke="#C9D3CB" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0.7 73.7 C0.7 78.7 3.7 80.7 9.7 80.7" stroke="#C9D3CB" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {topStages.map((s) => {
              const viewing = s.stage_no === activeStageNo;
              return (
                <Link
                  key={s.stage_no}
                  href={`${base}/stages/${s.stage_no}`}
                  className={`flex h-[32px] items-center justify-between rounded-[6px] pl-[26px] pr-[12px] text-[13px] ${
                    viewing ? "bg-gca-badge-bg" : "hover:bg-white"
                  }`}
                >
                  <span className={viewing ? "font-semibold text-gca-badge-text" : "font-normal text-gca-show"}>
                    {STAGE_SHORT_NAME[s.stage_no]}
                  </span>
                  <span className="font-mono text-[12px] text-gca-muted">
                    {s.state === "complete"
                      ? "Done"
                      : s.state === "active"
                        ? `${percentByStage?.[s.stage_no] ?? 0}%`
                        : "Not started"}
                  </span>
                </Link>
              );
            })}
            <Link
              href={`${base}/stages`}
              className="flex h-[32px] items-center gap-[8px] pl-[26px] text-[13px] font-medium text-gca-green"
            >
              All 10 stages
              <ChevronRight className="size-[10px]" />
            </Link>
          </div>
        )} */}
      </div>

      <div className="flex flex-col gap-[2px] border-t border-gca-border px-[12px] py-[8px]">
        <Link
          href={`${base}/settings`}
          className="flex items-center gap-[10px] rounded-[8px] px-[12px] py-[8px] hover:bg-white"
        >
          <Settings className="size-[16px] text-gca-show" />
          <span className="text-[14px] font-medium text-gca-show">Project settings</span>
        </Link>
        <button className="flex items-center gap-[10px] rounded-[8px] px-[12px] py-[8px] hover:bg-white">
          <PanelLeftClose className="size-[16px] text-gca-show" />
          <span className="text-[14px] font-medium text-gca-show">Collapse</span>
        </button>
      </div>
    </aside>
  );
}
