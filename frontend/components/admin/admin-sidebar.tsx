"use client";

import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileNavigation } from "@/components/mobile-navigation-context";

const NAV_ITEMS = [
  { label: "Users", href: "/admin/users", active: true },
  { label: "Projects", href: "/admin/projects", active: true },
  { label: "Reference data", href: "#", active: false },
  { label: "Stage checklists", href: "#", active: false },
  { label: "Approvals", href: "#", active: false, count: 2 },
  { label: "Audit log", href: "#", active: false },
  { label: "Deleted items", href: "#", active: false },
  { label: "Legacy import", href: "#", active: false },
];

function AdminSidebarLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <>
      <p className="px-[12px] pb-[8px] text-[12px] font-semibold tracking-[0.4px] text-gca-muted">
        Admin
      </p>
      {NAV_ITEMS.map((item) => {
        const isActive = item.active && pathname.startsWith(item.href);
        if (!item.active) {
          return (
            <span
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between rounded-[8px] px-[12px] py-[8px] text-[14px] text-gca-muted opacity-60"
              title="Not available yet"
            >
              {item.label}
              {item.count != null && (
                <span className="rounded-full bg-gca-warning px-[6px] py-[1px] text-[12px] font-semibold text-white">
                  {item.count}
                </span>
              )}
            </span>
          );
        }
        return (
          <Link
            key={item.label}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center justify-between rounded-[8px] px-[12px] py-[8px] text-[14px] ${
              isActive
                ? "bg-gca-badge-bg font-semibold text-gca-badge-text"
                : "text-gca-dark hover:bg-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { isOpen, activeTab, setIsOpen } = useMobileNavigation();
  const mobileSidebarTarget =
    typeof document === "undefined" ? null : document.getElementById("mobile-sidebar-content");

  return (
    <>
      <aside className="sticky top-[64px] hidden h-[calc(100vh-64px)] w-[240px] shrink-0 flex-col gap-[4px] overflow-y-auto border-r border-gca-border bg-gca-page-bg p-[16px] md:flex">
        <AdminSidebarLinks pathname={pathname} onNavigate={() => setIsOpen(false)} />
      </aside>
      {isOpen &&
        activeTab === "sidebar" &&
        mobileSidebarTarget &&
        createPortal(
          <aside className="flex h-full flex-col gap-[4px] overflow-y-auto bg-gca-page-bg p-[16px]">
            <AdminSidebarLinks pathname={pathname} onNavigate={() => setIsOpen(false)} />
          </aside>,
          mobileSidebarTarget,
        )}
    </>
  );
}
