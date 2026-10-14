"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Sun, Moon, HelpCircle, Bell, ChevronDown, FolderKanban, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import useOutsideClick from "@/hooks/use-outside-click";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects", hasDropdown: true },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Reports", href: "/reports" },
];

interface RecentProject {
  project_id: string;
  name: string;
  current_stage_name: string | null;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  cancelled: "Cancelled",
};

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick({ ref: dropdownRef, handler: () => setOpenDropdown(null) });

  const { data: recentProjects = [] } = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: async () => {
      const res = await api.get<{ projects: RecentProject[] }>("/projects?limit=3");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.projects;
    },
    enabled: isAuthenticated && openDropdown === "Projects",
  });

  const initials = user?.email
    ? user.email
        .split("@")[0]
        .split(".")
        .map((s) => s[0]?.toUpperCase())
        .join("")
        .slice(0, 2)
    : "?";

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 flex h-[64px] shrink-0 items-center justify-between border-b border-gca-border bg-white px-[24px]">
      {/* Left: logo + nav */}
      <div className="flex items-center gap-[20px]">
        <Link href="/">
          <Image src="/logo-gca.png" alt="Gas Connect Africa" width={89} height={32} priority />
        </Link>
        <div className="h-[20px] w-px bg-gca-border" />
        <nav className="flex items-center gap-[4px]" ref={dropdownRef}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <div key={item.label} className="relative">
                {item.hasDropdown ? (
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                    className="flex flex-col items-center gap-[6px] px-[12px] pb-[4px] pt-[10px] cursor-pointer"
                  >
                    <span className="flex items-center gap-[6px]">
                      <span
                        className={`text-[14px] ${active ? "font-medium text-gca-dark" : "font-medium text-gca-show"}`}
                      >
                        {item.label}
                      </span>
                      <ChevronDown className="size-[18] text-gca-show" />
                    </span>
                    <span
                      className={`size-[4px] rounded-full ${active ? "bg-gca-green" : "bg-transparent"}`}
                    />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className="flex flex-col items-center gap-[6px] px-[12px] pb-[4px] pt-[10px]"
                  >
                    <span
                      className={`text-[14px] ${active ? "font-medium text-gca-dark" : "font-medium text-gca-show"}`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`size-[4px] rounded-full ${active ? "bg-gca-green" : "bg-transparent"}`}
                    />
                  </Link>
                )}

                {/* Projects dropdown — recent projects + shortcuts (S-PM-09) */}
                {item.hasDropdown && openDropdown === "Projects" && (
                  <div onMouseEnter={() => setOpenDropdown(item.label)}
                    onMouseLeave={() => setOpenDropdown(null)} className="absolute left-0 top-[48px] z-50 w-[294px] rounded-[10px] border border-gca-border bg-white p-[8px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
                    <p className="pl-[14px] px-[10px] py-[6px] text-[12px] font-medium normal-case tracking-[0.4px] text-gca-muted">
                      Recent
                    </p>
                    {recentProjects.map((project) => (
                      <Link
                        key={project.project_id}
                        href={`/projects/${project.project_id}`}
                        onClick={() => setOpenDropdown(null)}
                        className="block rounded-[6px] px-[10px] py-[8px] hover:bg-gca-page-bg"
                      >
                        <p className="text-[13px] font-medium text-gca-dark">{project.name}</p>
                        <p className="text-[11px] text-gca-muted">
                          {project.current_stage_name ?? "—"} · {STATUS_LABELS[project.status] ?? project.status}
                        </p>
                      </Link>
                    ))}
                    <div className="my-[9px] h-px bg-gca-border" />
                    <Link
                      href="/projects"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-[14px] font-medium text-gca-dark hover:bg-gca-page-bg"
                    >
                      <FolderKanban className="size-[14px] text-gca-show" />
                      All projects
                    </Link>
                    <Link
                      href="/projects/new"
                      onClick={() => setOpenDropdown(null)}
                      className="flex items-center gap-[10px] rounded-[6px] px-[10px] py-[8px] text-[14px] font-medium text-gca-dark hover:bg-gca-page-bg"
                    >
                      <Plus className="size-[14px] text-gca-show" />
                      New project
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Right: search + actions */}
      <div className="flex items-center gap-[8px]">
        {/* Global search */}
        <div className="flex w-[300px] items-center justify-between rounded-[8px] bg-gca-page-bg px-[12px] py-[8px]">
          <Search className="size-[16px] text-gca-muted" />
          <span className="text-[14px] text-gca-muted">Search projects, DPRs, risks</span>
          <kbd className="rounded-[4px] border border-gca-border bg-white px-[6px] py-[2px] text-[11px] font-medium text-gca-show">
            Ctrl K
          </kbd>
        </div>

        {/* Theme switcher */}
        <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[2px]">
          <button className="flex size-[28px] items-center justify-center rounded-[6px] bg-white shadow-[0px_1px_2px_0px_rgba(23,48,31,0.08)]">
            <Sun className="size-[16px] text-gca-dark" />
          </button>
          <button className="flex size-[28px] items-center justify-center rounded-[6px]">
            <Moon className="size-[16px] text-gca-show" />
          </button>
        </div>

        {/* Help */}
        <button className="flex size-[36px] items-center justify-center rounded-[8px]">
          <HelpCircle className="size-[18px] text-gca-show" />
        </button>

        {/* Notifications */}
        <button className="relative flex size-[36px] items-center justify-center rounded-[8px]">
          <Bell className="size-[18px] text-gca-show" />
          <span className="absolute left-[30px] top-[-6px] flex items-center rounded-[6px] bg-gca-green px-[4px] py-px text-[11px] font-semibold text-white">
            4
          </span>
        </button>

        {/* User menu */}
        <button className="flex items-center gap-[8px] rounded-[8px] px-[4px] py-[2px]">
          <div className="flex size-[32px] items-center justify-center rounded-[8px] bg-gca-badge-bg">
            <span className="text-[12px] font-semibold text-gca-badge-text">{initials}</span>
          </div>
          <ChevronDown className="size-[8px] text-gca-show" />
        </button>
      </div>
    </header>
  );
}
