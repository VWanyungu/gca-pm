"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

interface MobileFilterToggleProps {
  children: ReactNode;
  /** Always-visible controls (e.g. search input) shown outside the collapsible on mobile */
  always?: ReactNode;
}

export function MobileFilterToggle({ children, always }: MobileFilterToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col md:flex-row gap-[12px]">
      {always}
      {/* Desktop: show filters inline */}
      <div className="hidden sm:contents">{children}</div>
      {/* Mobile: toggle button + collapsible */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex h-[40px] items-center gap-[8px] rounded-[8px] border px-[14px] text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
            open
              ? "border-gca-green bg-gca-badge-bg text-gca-badge-text"
              : "border-gca-border bg-gca-surface text-gca-dark"
          }`}
        >
          {open ? <X className="size-[14px]" /> : <SlidersHorizontal className="size-[14px]" />}
          Filters
        </button>
        {open && <div className="mt-[12px] flex flex-col gap-[12px]">{children}</div>}
      </div>
    </div>
  );
}
