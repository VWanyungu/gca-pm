"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
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
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useMobileNavigation } from "@/components/mobile-navigation-context";
import { STAGE_SHORT_NAME } from "./types";
import { useProjectSidebarData } from "./project-sidebar-context";

const ROLE_BLURB: Record<string, string> = {
  PM: "Full access to this project",
  Planner: "Can edit schedule and submissions",
  SiteEngineer: "Can submit daily progress reports",
  ExCo: "Executive visibility across projects",
  Admin: "Full platform access",
  ProjectCreator: "Can create and configure projects",
};

/** Reads its data from ProjectSidebarProvider (set up once in the `[projectId]` layout) instead
 *  of props, so it renders once per project and survives navigation between its sub-pages. */
export function ProjectSidebar() {
  const { projectId, stages, counts, percentByStage, active, activeStageNo } =
    useProjectSidebarData();
  const { user } = useAuth();
  const { isOpen, setIsOpen } = useMobileNavigation();
  const [stagesOpen, setStagesOpen] = useState(false);
  const [allStagesOpen, setAllStagesOpen] = useState(true);

  const myRole = user?.role.find(
    (r) => r.scope_type === "project" && r.project_id === projectId,
  )?.role;

  const isEngineer = myRole === "SiteEngineer";

  const base = `/projects/${projectId}`;
  const navItems = (
    [
      { key: "overview", label: "Overview", icon: LayoutGrid, href: base },
      { key: "schedule", label: "Schedule", icon: CalendarRange, href: `${base}/schedule` },
      { key: "dpr", label: "Daily Report", icon: ClipboardList, href: `${base}/dpr` },
      // Weekly submission is the PM's report to ExCo — not an engineer's concern.
      {
        key: "submit",
        label: "Weekly Report",
        icon: Send,
        href: `${base}/weekly-submission`,
        count: counts?.submit,
        hidden: isEngineer,
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
    ] as const
  ).filter((item) => !("hidden" in item && item.hidden));

  const inScopeStages = stages.filter((s) => s.in_scope).sort((a, b) => a.stage_no - b.stage_no);
  const topStages = inScopeStages.filter((s) => s.state !== "complete").slice(0, 3);
  const visibleStages = allStagesOpen ? inScopeStages : topStages;
  const stageListHeight = visibleStages.length * 34;
  const mobileSidebarTarget =
    typeof document === "undefined" ? null : document.getElementById("mobile-sidebar-content");

  const sidebarContent = (
    <>
      <div className="flex flex-col gap-[2px] px-[12px] pt-[0px]">
        {myRole && (
          <div className="mb-[0px] flex flex-col gap-[2px] rounded-[10px] px-[12px] pt-[10px] pb-[8px] text-gca-show">
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
              onClick={() => setIsOpen(false)}
              className={`flex items-center justify-between rounded-[8px] px-[12px] py-[8px] ${
                isActive ? "bg-gca-badge-bg" : "hover:bg-gca-surface"
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

        {/* Stages — PM/Planner territory, not an engineer's */}
        {!isEngineer && (
          <>
            <button
              onClick={() => setStagesOpen((o) => !o)}
              className="flex items-center justify-between rounded-[8px] px-[12px] py-[8px] hover:bg-gca-surface"
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
                {visibleStages.length > 0 && (
                  <svg
                    className="pointer-events-none absolute left-[20px] top-0"
                    width={9}
                    height={stageListHeight}
                    viewBox={`0 0 10.4 ${stageListHeight}`}
                    fill="none"
                  >
                    <path
                      d={`M0.7 0.7 V${visibleStages.length * 34}`}
                      stroke="#C9D3CB"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                    />
                    {/* {visibleStages.map((stage, index) => {
                  const y = index * 34 + 16;
                  return (
                    <path
                      key={stage.stage_no}
                      d={`M0.7 ${y - 7} C0.7 ${y - 2} 3.7 ${y} 9.7 ${y}`}
                      stroke="#C9D3CB"
                      strokeWidth={1.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })} */}
                  </svg>
                )}
                {visibleStages.map((s) => {
                  const viewing = s.stage_no === activeStageNo;
                  return (
                    <Link
                      key={s.stage_no}
                      href={`${base}/stages/${s.stage_no}`}
                      onClick={() => setIsOpen(false)}
                      className={`flex h-[32px] items-center justify-between rounded-[6px] pl-[26px] pr-[12px] text-[13px] ${
                        viewing ? "bg-gca-badge-bg" : "hover:bg-gca-surface"
                      }`}
                    >
                      <span
                        className={
                          viewing
                            ? "font-semibold text-gca-badge-text"
                            : "font-normal text-gca-show"
                        }
                      >
                        {STAGE_SHORT_NAME[s.stage_no]}
                      </span>
                      <span className="font-mono text-[12px] text-gca-muted">
                        {s.state === "complete" ? "Done" : `${percentByStage?.[s.stage_no] ?? 0}%`}
                      </span>
                    </Link>
                  );
                })}
                {inScopeStages.length > topStages.length && (
                  <button
                    type="button"
                    aria-expanded={allStagesOpen}
                    onClick={() => setAllStagesOpen((open) => !open)}
                    className="flex h-[32px] cursor-pointer items-center gap-[8px] pl-[26px] text-[13px] font-medium text-gca-green"
                  >
                    {allStagesOpen ? "Show fewer stages" : `All ${inScopeStages.length} stages`}
                    <ChevronRight
                      className={`size-[18] transition-transform ${allStagesOpen ? "rotate-270" : "rotate-90"}`}
                    />
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-col gap-[2px] border-t border-gca-border px-[12px] py-[8px]">
        <Link
          href={`${base}/settings`}
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-[10px] rounded-[8px] px-[12px] py-[8px] ${
            active === "settings" ? "bg-gca-badge-bg" : "hover:bg-gca-surface"
          }`}
        >
          <Settings
            className={`size-[16px] ${active === "settings" ? "text-gca-green" : "text-gca-show"}`}
          />
          <span
            className={`text-[14px] ${active === "settings" ? "font-semibold text-gca-green-hover" : "font-medium text-gca-show"}`}
          >
            Project settings
          </span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-[240px] shrink-0 flex-col justify-between overflow-y-auto border-r border-gca-border bg-gca-page-bg md:flex">
        {sidebarContent}
      </aside>
      {isOpen &&
        mobileSidebarTarget &&
        createPortal(
          <aside className="flex flex-col justify-between border-t border-gca-border bg-gca-page-bg py-[8px]">
            {sidebarContent}
          </aside>,
          mobileSidebarTarget,
        )}
    </>
  );
}
