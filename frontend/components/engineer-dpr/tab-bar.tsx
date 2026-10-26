"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Home, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TABS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/engineer", icon: Home },
  { label: "Schedule", href: "/engineer/schedule", icon: CalendarDays },
  { label: "My DPRs", href: "/engineer/dprs", icon: ClipboardList },
  { label: "Profile", href: "/profile", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full shrink-0 items-center border-t border-gca-border bg-gca-surface pt-[10px] pb-[28px]">
      {TABS.map(({ label, href, icon: Icon }) => {
        const isActive = href === "/engineer" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center gap-[4px] py-[4px]"
          >
            <Icon
              className="h-[22px] w-[22px]"
              strokeWidth={isActive ? 2.25 : 1.75}
              color={isActive ? "#1f5530" : "#8d9c91"}
            />
            <p
              className={
                isActive
                  ? "text-[11px] font-semibold text-gca-badge-text"
                  : "text-[11px] font-normal text-gca-muted"
              }
            >
              {label}
            </p>
          </Link>
        );
      })}
    </nav>
  );
}
