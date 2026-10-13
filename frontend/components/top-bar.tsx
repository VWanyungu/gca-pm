"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Search, Sun, Moon, HelpCircle, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  {
    label: "Projects",
    href: "/projects",
    children: [
      { label: "All projects", href: "/projects" },
      { label: "My projects", href: "/projects?filter=mine" },
    ],
  },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Reports", href: "/reports" },
];

export function TopBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <header className="flex h-[64px] shrink-0 items-center justify-between border-b border-gca-border bg-white px-[24px]">
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
                {item.children ? (
                  <button
                    onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                    className={`flex flex-col items-center gap-[6px] px-[12px] pb-[4px] pt-[10px] ${active ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <span className="flex items-center gap-[6px]">
                      <span
                        className={`text-[14px] ${active ? "font-semibold text-gca-dark" : "font-medium text-gca-show"}`}
                      >
                        {item.label}
                      </span>
                      <ChevronDown className="size-[8px] text-gca-show" />
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
                      className={`text-[14px] ${active ? "font-semibold text-gca-dark" : "font-medium text-gca-show"}`}
                    >
                      {item.label}
                    </span>
                    <span
                      className={`size-[4px] rounded-full ${active ? "bg-gca-green" : "bg-transparent"}`}
                    />
                  </Link>
                )}

                {/* Dropdown */}
                {item.children && openDropdown === item.label && (
                  <div className="absolute left-0 top-[48px] z-50 min-w-[180px] rounded-[8px] border border-gca-border bg-white py-[4px] shadow-[0px_4px_12px_rgba(0,0,0,0.08)]">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setOpenDropdown(null)}
                        className="block px-[14px] py-[8px] text-[13px] font-medium text-gca-dark hover:bg-gca-page-bg"
                      >
                        {child.label}
                      </Link>
                    ))}
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
          <span className="absolute left-[20px] top-[4px] flex items-center rounded-[6px] bg-gca-green px-[4px] py-px text-[11px] font-semibold text-white">
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
