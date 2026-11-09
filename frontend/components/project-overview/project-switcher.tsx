"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronsUpDown, ChevronUp, FolderKanban, Search } from "lucide-react";
import { api } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface ProjectHit {
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

const PANEL_WIDTH = 320;

/** Sits where the sidebar used to show the viewer's role. Clicking it drops a floating
 *  search bar and results card — a "gooey search" command-palette, the same shape as an
 *  OS-level search launcher — listing every project the viewer can see, so switching
 *  projects doesn't mean going back to the list.
 *  Portaled to <body> and positioned from the trigger's own rect — the sidebar scrolls
 *  with overflow-y-auto, which would otherwise clip a panel wider than the sidebar. */
export function ProjectSwitcher({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 200);

  // The panel is portaled to <body>, so it isn't a DOM descendant of the trigger —
  // a plain "outside click" check against one ref would treat clicks inside the
  // panel itself as outside and close it before the item's own onClick ever fires.
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const { data: projects = [], isFetching } = useQuery({
    queryKey: ["projects", "switcher", debounced],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "8" });
      if (debounced) params.set("search", debounced);
      const res = await api.get<{ projects: ProjectHit[] }>(`/projects?${params}`, {
        silent: true,
      });
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data.projects;
    },
    enabled: isOpen,
    staleTime: 30_000,
  });

  function open() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + 8, left: rect.left });
    setIsOpen(true);
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function go(id: string) {
    setIsOpen(false);
    setQuery("");
    if (id !== projectId) router.push(`/projects/${id}`);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (projects.length === 0 ? 0 : (i + 1) % projects.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) =>
        projects.length === 0 ? 0 : (i - 1 + projects.length) % projects.length,
      );
    }
    if (event.key === "Enter" && projects[activeIndex]) {
      event.preventDefault();
      go(projects[activeIndex].project_id);
    }
  }

  const noResults = useMemo(
    () => !isFetching && debounced.length > 0 && projects.length === 0,
    [isFetching, debounced, projects],
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-expanded={isOpen}
        aria-label="Switch project"
        className="flex w-full items-center justify-between rounded-[10px] px-[12px] py-[6px] hover:bg-gca-page-bg"
      >
        <span className="truncate text-[14px] font-semibold text-gca-dark">{projectName}</span>
        <ChevronsUpDown className="size-[13px] text-gca-muted" />
        {/* {isOpen ? (
          <ChevronUp className="size-[14px] shrink-0 text-gca-muted" />
        ) : (
          <ChevronDown className="size-[14px] shrink-0 text-gca-muted" />
        )} */}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
            className="fixed z-50 flex flex-col gap-[8px]"
          >
            {/* The search bar floats as its own pill, same as an OS-level search launcher. */}
            <div className="flex items-center gap-[10px] rounded-full border border-gca-border bg-gca-surface px-[18px] py-[12px] shadow-[0px_10px_28px_0px_rgba(23,48,31,0.18)]">
              <Search className="size-[16px] shrink-0 text-gca-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder="Switch project"
                aria-label="Search projects"
                className="w-full min-w-0 bg-transparent text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
              />
            </div>

            <div
              role="listbox"
              aria-label="Switch project"
              className="flex max-h-[360px] flex-col overflow-hidden rounded-[14px] border border-gca-border bg-gca-surface shadow-[0px_10px_28px_0px_rgba(23,48,31,0.18)]"
            >
              <div className="max-h-[300px] overflow-y-auto">
                <p className="bg-gca-page-bg px-[16px] py-[6px] text-[12px] font-semibold text-gca-muted">
                  Projects
                </p>
                {noResults && (
                  <p className="px-[16px] py-[20px] text-[13px] text-gca-muted">
                    Nothing matches “{debounced}”.
                  </p>
                )}
                {projects.map((project, index) => (
                  <button
                    key={project.project_id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => go(project.project_id)}
                    className={`flex w-full items-center gap-[10px] px-[16px] py-[6px] text-left ${
                      index === activeIndex ? "bg-gca-badge-bg" : "hover:bg-gca-page-bg"
                    }`}
                  >
                    <span className="flex size-[28px] shrink-0 items-center justify-center rounded-[8px] bg-gca-badge-bg">
                      <FolderKanban className="size-[14px] text-gca-green" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-gca-dark">
                        {project.name}
                        {project.project_id === projectId && (
                          <span className="ml-[6px] text-[11px] font-normal text-gca-muted">
                            (current)
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-[12px] text-gca-muted">
                        {project.current_stage_name ?? "—"} ·{" "}
                        {STATUS_LABELS[project.status] ?? project.status}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-gca-border px-[16px] py-[8px] text-[11px] text-gca-muted">
                <span>↑↓ to move · ↵ to open · Esc to close</span>
                {isFetching && <span>Searching…</span>}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
