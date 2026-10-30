"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
  Moon,
  HelpCircle,
  Bell,
  ChevronDown,
  FolderKanban,
  Plus,
  Menu,
  X,
  User,
  LogOut,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api-client";
import { canAccess, CAN_MANAGE_USERS, CAN_VIEW_REPORTS } from "@/lib/access-control";
import useOutsideClick from "@/hooks/use-outside-click";
import { useUnreadCount } from "@/components/notifications/use-notifications";
import { useMobileNavigation } from "@/components/mobile-navigation-context";
import { useTheme } from "@/components/theme-provider";
import { GlobalSearch, type GlobalSearchHandle } from "@/components/global-search";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects", hasDropdown: true },
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
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { isOpen: mobileMenuOpen, setIsOpen: setMobileMenuOpen } = useMobileNavigation();
  const { toggle: toggleTheme } = useTheme();
  const desktopSearchRef = useRef<GlobalSearchHandle>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        desktopSearchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useOutsideClick({ ref: dropdownRef, handler: () => setOpenDropdown(null) });
  useOutsideClick({ ref: accountMenuRef, handler: () => setAccountMenuOpen(false) });

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  async function handleSignOut() {
    setAccountMenuOpen(false);
    setMobileMenuOpen(false);
    setSigningOut(true);
    await logout();
    router.push("/login");
  }

  const { data: recentProjects = [] } = useQuery({
    queryKey: ["projects", "recent"],
    queryFn: async () => {
      const res = await api.get<{ projects: RecentProject[] }>("/projects?limit=3");
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.projects;
    },
    enabled:
      isAuthenticated && (openDropdown === "Projects" || (mobileMenuOpen && mobileProjectsOpen)),
  });

  const { data: unreadCount = 0 } = useUnreadCount();

  let navItems = canAccess(user?.role, CAN_MANAGE_USERS)
    ? [...NAV_ITEMS, { label: "Admin", href: "/admin" }]
    : NAV_ITEMS;

  navItems = canAccess(user?.role, CAN_VIEW_REPORTS)
    ? [...navItems, { label: "Exco", href: "/reports" }]
    : navItems;

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
    <>
      <header className="sticky top-0 z-40 flex h-[64px] shrink-0 items-center justify-between border-b border-gca-border bg-gca-surface px-[12px] sm:px-[24px]">
        {/* Left: logo + nav */}
        <div className="flex min-w-0 items-center gap-[20px]">
          <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hidden md:block">
            <Image src="/GCA Logo.svg" alt="Gas Connect Africa" width={89} height={32} priority />
          </Link>
          <div className="md:hidden">
            <div className="flex gap-[12px] items-center justify-start">
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex size-[36px] items-center justify-center rounded-[8px] text-gca-dark hover:bg-gca-page-bg"
              >
                {mobileMenuOpen ? <X className="size-[18]" /> : <Menu className="size-[18]" />}
              </button>

              <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                <Image
                  src="/GCA Logo.svg"
                  alt="Gas Connect Africa"
                  width={89}
                  height={32}
                  priority
                />
              </Link>
            </div>

            {/* ── Mobile panel ── */}
            <div
              className={`fixed inset-x-0 bottom-0 top-[64px] z-[70] flex-col bg-gca-surface md:hidden ${
                mobileMenuOpen ? "flex" : "hidden"
              }`}
            >
              <div className="flex flex-1 flex-col overflow-y-auto">
                {/* Search */}
                <div className="px-[16px] pt-[16px] pb-[8px]">
                  <GlobalSearch
                    className="w-full"
                    inputBoxClassName="border border-gca-border px-[14px] py-[10px]"
                  />
                </div>

                {/* Main navigation */}
                <nav aria-label="Main navigation" className="flex flex-col gap-[2px] px-[16px] py-[8px]">
                  {navItems.map((item) =>
                    item.hasDropdown ? (
                      <div key={item.label}>
                        <button
                          type="button"
                          aria-expanded={mobileProjectsOpen}
                          onClick={() => setMobileProjectsOpen((open) => !open)}
                          className="flex w-full items-center justify-between rounded-[8px] px-[12px] py-[10px] text-left text-[15px] font-medium text-gca-dark hover:bg-gca-page-bg transition-colors duration-150"
                        >
                          {item.label}
                          <ChevronDown
                            className={`size-[16px] text-gca-muted transition-transform duration-200 ${mobileProjectsOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {mobileProjectsOpen && (
                          <div className="ml-[12px] flex flex-col gap-[2px] border-l border-gca-border pl-[12px] py-[4px]">
                            {recentProjects.map((project) => (
                              <Link
                                key={project.project_id}
                                href={`/projects/${project.project_id}`}
                                onClick={() => setMobileMenuOpen(false)}
                                className="rounded-[8px] px-[12px] py-[8px] hover:bg-gca-page-bg transition-colors duration-150"
                              >
                                <span className="block text-[14px] font-medium text-gca-dark">
                                  {project.name}
                                </span>
                                <span className="block text-[12px] text-gca-muted">
                                  {project.current_stage_name ?? "—"} ·{" "}
                                  {STATUS_LABELS[project.status] ?? project.status}
                                </span>
                              </Link>
                            ))}
                            <Link
                              href="/"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[14px] font-medium text-gca-dark hover:bg-gca-page-bg transition-colors duration-150"
                            >
                              <FolderKanban className="size-[14px] text-gca-show" />
                              All projects
                            </Link>
                            <Link
                              href="/projects/new"
                              onClick={() => setMobileMenuOpen(false)}
                              className="flex items-center gap-[10px] rounded-[8px] px-[12px] py-[10px] text-[14px] font-medium text-gca-dark hover:bg-gca-page-bg transition-colors duration-150"
                            >
                              <Plus className="size-[14px] text-gca-show" />
                              New project
                            </Link>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`rounded-[8px] px-[12px] py-[10px] text-[15px] transition-colors duration-150 ${
                          isActive(item.href)
                            ? "bg-gca-badge-bg font-semibold text-gca-badge-text"
                            : "font-medium text-gca-dark hover:bg-gca-page-bg"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ),
                  )}
                </nav>

                {/* Sidebar content (portaled from project/admin sidebar) */}
                <div id="mobile-sidebar-content" />
              </div>

              {/* Bottom: user card */}
              <div className="border-t border-gca-border bg-gca-surface px-[16px] py-[12px]">
                <div className="flex items-center gap-[12px] rounded-[10px] bg-gca-page-bg px-[14px] py-[12px]">
                  <div className="flex size-[36px] shrink-0 items-center justify-center rounded-[8px] bg-gca-badge-bg">
                    <span className="text-[13px] font-semibold text-gca-badge-text">{initials}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-gca-dark">
                      {user?.firstName || user?.email?.split("@")[0] || "Account"}
                    </p>
                    <p className="truncate text-[12px] text-gca-muted">{user?.email}</p>
                  </div>
                </div>
                <div className="mt-[8px] flex gap-[8px]">
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-1 items-center justify-center gap-[6px] rounded-[8px] border border-gca-border bg-gca-surface py-[9px] text-[13px] font-medium text-gca-dark hover:bg-gca-page-bg transition-colors duration-150"
                  >
                    <User className="size-[14px] text-gca-show" />
                    My profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex flex-1 items-center justify-center gap-[6px] rounded-[8px] border border-gca-border bg-gca-surface py-[9px] text-[13px] font-medium text-error-text hover:bg-gca-page-bg transition-colors duration-150 cursor-pointer disabled:opacity-60"
                  >
                    {signingOut ? (
                      <LoaderCircle className="size-[14px] animate-spin" />
                    ) : (
                      <LogOut className="size-[14px]" />
                    )}
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden h-[20px] w-px bg-gca-border md:block" />
          <nav className="hidden items-center gap-[4px] md:flex" ref={dropdownRef}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <div key={item.label} className="relative">
                  {item.hasDropdown ? (
                    <button
                      onClick={() =>
                        setOpenDropdown(openDropdown === item.label ? null : item.label)
                      }
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
                    <div
                      onMouseEnter={() => setOpenDropdown(item.label)}
                      onMouseLeave={() => setOpenDropdown(null)}
                      className="absolute left-0 top-[48px] z-50 w-[294px] rounded-[10px] border border-gca-border bg-gca-surface p-[8px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)]"
                    >
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
                            {project.current_stage_name ?? "—"} ·{" "}
                            {STATUS_LABELS[project.status] ?? project.status}
                          </p>
                        </Link>
                      ))}
                      <div className="my-[9px] h-px bg-gca-border" />
                      <Link
                        href="/"
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
        <div className="flex shrink-0 items-center gap-[2px] sm:gap-[8px]">
          {/* Global search */}
          <GlobalSearch ref={desktopSearchRef} className="hidden w-[300px] lg:block" showShortcutHint />


          {/* Theme switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
            className="flex size-[32px] cursor-pointer items-center justify-center rounded-[8px] hover:bg-gca-page-bg"
          >
            <span className="theme-icon-window size-[16px]">
              <Moon className="theme-icon theme-icon-moon size-[16px] text-gca-dark" />
              <Sun className="theme-icon theme-icon-sun size-[16px] text-gca-dark" />
            </span>
          </button>

          {/* Help */}
          <button className="hidden size-[36px] items-center justify-center rounded-[8px] md:flex">
            <HelpCircle className="size-[18px] text-gca-show" />
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative flex size-[36px] items-center justify-center rounded-[8px] hover:bg-gca-page-bg"
          >
            <Bell className="size-[18px] text-gca-show" />
            {unreadCount > 0 && (
              <span className="absolute left-[30px] top-[-6px] flex items-center rounded-[6px] bg-gca-green px-[4px] py-px text-[11px] font-semibold text-gca-on-accent">
                {unreadCount}
              </span>
            )}
          </Link>

          {/* User menu */}
          <div className="relative hidden md:block" ref={accountMenuRef}>
            <button
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex items-center gap-[8px] rounded-[8px] px-[4px] py-[2px] cursor-pointer"
            >
              <div className="flex size-[32px] items-center justify-center rounded-[8px] bg-gca-badge-bg">
                <span className="text-[12px] font-semibold text-gca-badge-text">{initials}</span>
              </div>
              <ChevronDown className="hidden size-[8px] text-gca-show sm:block" />
            </button>

            {accountMenuOpen && (
              <div className="absolute right-0 top-[44px] z-50 w-[260px] rounded-[12px] border border-gca-border bg-gca-surface p-[8px] shadow-[0px_10px_28px_0px_rgba(23,48,31,0.08)]">
                <div className="flex flex-col gap-[2px] px-[10px] py-[8px]">
                  <p className="truncate text-[14px] font-semibold text-gca-dark">
                    {user?.firstName || user?.email || "Account"}
                  </p>
                  <p className="truncate text-[12px] text-gca-show">{user?.email}</p>
                </div>
                <div className="my-[4px] h-px bg-gca-border" />
                <Link
                  href="/profile"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block rounded-[6px] px-[10px] py-[9px] text-[14px] text-gca-dark hover:bg-gca-page-bg"
                >
                  My profile
                </Link>
                <Link
                  href="/notifications?tab=preferences"
                  onClick={() => setAccountMenuOpen(false)}
                  className="block rounded-[6px] px-[10px] py-[9px] text-[14px] text-gca-dark hover:bg-gca-page-bg"
                >
                  Notification preferences
                </Link>
                <div className="my-[4px] h-px bg-gca-border" />
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-[6px] rounded-[6px] px-[10px] py-[9px] text-left text-[14px] text-error-text hover:bg-gca-page-bg cursor-pointer disabled:opacity-60"
                >
                  <span className="flex size-[13px] shrink-0 items-center justify-center">
                    {signingOut && <LoaderCircle className="size-[13px] animate-spin" />}
                  </span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
