"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, FolderKanban, GitPullRequest, Flag, Search, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface SearchHit {
  id: string;
  project_id: string;
  project_name: string;
  title: string;
  subtitle: string | null;
}

interface SearchResults {
  projects: SearchHit[];
  risks: SearchHit[];
  changeRequests: SearchHit[];
  milestones: SearchHit[];
}

/** The server requires at least two characters; asking sooner only wastes a round trip. */
const MIN_QUERY = 2;

const GROUPS = [
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "risks", label: "Risks & issues", icon: AlertTriangle },
  { key: "changeRequests", label: "Change requests", icon: GitPullRequest },
  { key: "milestones", label: "Milestones", icon: Flag },
] as const;

function hrefFor(group: (typeof GROUPS)[number]["key"], hit: SearchHit): string {
  switch (group) {
    case "projects":
      return `/projects/${hit.project_id}`;
    case "risks":
      return `/projects/${hit.project_id}/risks`;
    case "changeRequests":
      return `/projects/${hit.project_id}/change-requests`;
    case "milestones":
      return `/projects/${hit.project_id}/milestones`;
  }
}

/** Mounting the dialog only while it is open means its query and selection start fresh every
 *  time, with no effect to reset them on close. */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SearchDialog onClose={onClose} />;
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debounced = useDebouncedValue(query.trim(), 200);

  const { data, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: async () => {
      const res = await api.get<SearchResults>(
        `/search?q=${encodeURIComponent(debounced)}`,
        // A search that finds nothing is not an error worth a toast.
        { silent: true },
      );
      if (res.status !== "success" || !res.data) throw new Error(res.message);
      return res.data;
    },
    enabled: debounced.length >= MIN_QUERY,
    staleTime: 30_000,
  });

  // One flat list behind the grouped display, so the arrow keys can cross group boundaries.
  const flat = useMemo(() => {
    if (!data) return [];
    return GROUPS.flatMap((group) =>
      data[group.key].map((hit) => ({ group: group.key, hit, href: hrefFor(group.key, hit) })),
    );
  }, [data]);

  function go(href: string) {
    onClose();
    router.push(href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
    }
    if (event.key === "Enter" && flat[activeIndex]) {
      event.preventDefault();
      go(flat[activeIndex].href);
    }
  }

  const tooShort = debounced.length > 0 && debounced.length < MIN_QUERY;
  const noResults = !isFetching && debounced.length >= MIN_QUERY && flat.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-gca-dark/30 p-[16px] pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        className="flex w-full max-w-[640px] flex-col overflow-hidden rounded-[12px] border border-gca-border bg-gca-surface shadow-[0px_10px_28px_0px_rgba(23,48,31,0.18)]"
      >
        <div className="flex items-center gap-[10px] border-b border-gca-border px-[16px] py-[12px]">
          <Search className="size-[16px] shrink-0 text-gca-muted" />
          <input
            // Focus belongs in a search dialog the user just opened.
            autoFocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              // A new query means a new result list, so the highlight goes back to the top.
              setActiveIndex(0);
            }}
            placeholder="Search projects, risks, change requests, milestones"
            aria-label="Search projects, risks, change requests and milestones"
            className="min-w-0 w-full bg-transparent text-[15px] text-gca-dark outline-none placeholder:text-gca-muted"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="flex size-[24px] shrink-0 cursor-pointer items-center justify-center rounded-[6px] text-gca-muted hover:bg-gca-page-bg"
          >
            <X className="size-[16px]" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {query.length === 0 && (
            <p className="px-[16px] py-[20px] text-[13px] text-gca-muted">
              Type to search across every project you can see.
            </p>
          )}
          {tooShort && (
            <p className="px-[16px] py-[20px] text-[13px] text-gca-muted">
              Keep typing — at least {MIN_QUERY} characters.
            </p>
          )}
          {noResults && (
            <p className="px-[16px] py-[20px] text-[13px] text-gca-muted">
              Nothing matches “{debounced}”.
            </p>
          )}

          {GROUPS.map((group) => {
            const hits = data?.[group.key] ?? [];
            if (hits.length === 0) return null;
            const Icon = group.icon;
            return (
              <div key={group.key} className="flex flex-col">
                <p className="bg-gca-page-bg px-[16px] py-[6px] text-[12px] font-semibold text-gca-muted">
                  {group.label}
                </p>
                {hits.map((hit) => {
                  const index = flat.findIndex((f) => f.group === group.key && f.hit.id === hit.id);
                  return (
                    <button
                      key={`${group.key}-${hit.id}`}
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => go(hrefFor(group.key, hit))}
                      className={`flex w-full cursor-pointer items-center gap-[10px] px-[16px] py-[10px] text-left ${
                        index === activeIndex ? "bg-gca-badge-bg" : "hover:bg-gca-page-bg"
                      }`}
                    >
                      <Icon className="size-[15px] shrink-0 text-gca-green" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-gca-dark">
                          {hit.title}
                        </span>
                        <span className="block truncate text-[12px] text-gca-muted">
                          {group.key === "projects"
                            ? (hit.subtitle ?? "Project")
                            : `${hit.project_name}${hit.subtitle ? ` · ${hit.subtitle}` : ""}`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-gca-border px-[16px] py-[8px] text-[11px] text-gca-muted">
          <span>↑↓ to move · ↵ to open · Esc to close</span>
          {isFetching && <span>Searching…</span>}
        </div>
      </div>
    </div>
  );
}
