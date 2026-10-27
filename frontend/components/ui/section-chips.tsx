"use client";

import { useEffect, useRef } from "react";

export interface SectionChip {
  id: string;
  label: string;
}

/**
 * The narrow-screen stand-in for a sticky table-of-contents rail: the same section list
 * laid out as one horizontally scrolling row under the page heading. Hidden from `lg` up,
 * where a 220–260px rail can sit beside the content without crushing it.
 *
 * Keeps the active chip in view, so scrolling the page scrolls the strip with it.
 */
export function SectionChips({
  sections,
  activeId,
  onSelect,
  label = "Sections",
}: {
  sections: readonly SectionChip[];
  activeId: string;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>(`[data-chip="${activeId}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  return (
    <div
      ref={stripRef}
      role="tablist"
      aria-label={label}
      className="no-scrollbar -mx-[20px] flex gap-[8px] overflow-x-auto px-[20px] py-[2px] lg:hidden"
    >
      {sections.map((section) => {
        const isActive = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-chip={section.id}
            onClick={() => onSelect(section.id)}
            className={`shrink-0 cursor-pointer rounded-full border px-[14px] py-[7px] text-[13px] whitespace-nowrap ${
              isActive
                ? "border-gca-green bg-gca-badge-bg font-semibold text-gca-green"
                : "border-gca-border bg-gca-surface font-medium text-gca-show"
            }`}
          >
            {section.label}
          </button>
        );
      })}
    </div>
  );
}
