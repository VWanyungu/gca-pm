"use client";

import { useState } from "react";
import { List } from "lucide-react";

export interface SectionChip {
  id: string;
  label: string;
}

/**
 * The narrow-screen stand-in for a sticky table-of-contents rail: a floating button that
 * opens a bottom sheet listing every section, so the long-scrolling form stays fully visible
 * underneath rather than being replaced by a strip or a step flow. Hidden from `lg` up, where
 * a 220–260px rail can sit beside the content without crushing it.
 */
export function SectionTocSheet({
  sections,
  activeId,
  onSelect,
  label = "Contents",
}: {
  sections: readonly SectionChip[];
  activeId: string;
  onSelect: (id: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  function select(id: string) {
    onSelect(id);
    setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[20px] right-[20px] z-40 flex cursor-pointer items-center gap-[8px] rounded-full border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark shadow-[0px_8px_20px_0px_rgba(23,48,31,0.18)]"
      >
        <List className="size-[16px]" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label={label}>
          <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={() => setOpen(false)} />
          <div className="relative flex max-h-[70vh] w-full flex-col gap-[2px] overflow-y-auto rounded-t-[16px] bg-gca-surface px-[20px] pt-[12px] pb-[24px] shadow-[0px_-12px_32px_0px_rgba(23,48,31,0.12)]">
            <div className="mx-auto mb-[8px] h-[4px] w-[36px] shrink-0 rounded-full bg-gca-border" />
            <p className="mb-[4px] text-[16px] font-semibold text-gca-dark">{label}</p>
            {sections.map((section) => {
              const isActive = section.id === activeId;
              return (
                <button
                  key={section.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => select(section.id)}
                  className={`cursor-pointer rounded-[8px] px-[12px] py-[12px] text-left text-[15px] ${
                    isActive
                      ? "bg-gca-badge-bg font-semibold text-gca-green"
                      : "font-medium text-gca-dark hover:bg-gca-page-bg"
                  }`}
                >
                  {section.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
