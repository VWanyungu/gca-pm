"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import Dropdown from "@/components/Dropdown";
import { Pagination } from "@/components/pagination";
import { useAdminProjects } from "@/components/admin/use-admin-projects-data";
import { useProgramsList } from "@/components/admin/use-admin-users-data";
import { DeleteProjectModal } from "@/components/admin/delete-project-modal";
import type { AdminProjectListItem, ProjectStatus } from "@/components/admin/types";

const STATUS_OPTIONS = [
  { id: "all", name: "All statuses" },
  { id: "active", name: "Active" },
  { id: "on_hold", name: "On hold" },
  { id: "complete", name: "Complete" },
  { id: "cancelled", name: "Cancelled" },
];

const STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "text-gca-green",
  complete: "text-gca-green",
  on_hold: "text-gca-warning",
  cancelled: "text-error-text",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  complete: "Complete",
  cancelled: "Cancelled",
};

export default function AdminProjectsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | undefined>("active");
  const [programFilter, setProgramFilter] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [deleting, setDeleting] = useState<AdminProjectListItem | null>(null);

  const { data: programs = [] } = useProgramsList();
  const programOptions = [
    { id: "all", name: "All programs" },
    ...programs.map((p) => ({ id: String(p.program_id), name: p.name })),
  ];

  const { data } = useAdminProjects({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter,
    programId: programFilter,
  });
  const projects = data?.projects ?? [];
  const activeCount = projects.filter((p) => p.status === "active").length;

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
      <div>
        <h1 className="text-[24px] font-semibold text-gca-dark">Projects</h1>
        <p className="text-[14px] text-gca-muted">
          {data?.total ?? 0} projects · {activeCount} active
        </p>
      </div>

      <div className="flex items-center justify-between gap-[12px]">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search projects"
          className="h-[40px] w-[320px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
        />
        <div className="flex items-center gap-[12px]">
          <Dropdown
            id="status-filter"
            title="All statuses"
            data={STATUS_OPTIONS}
            selectedId={statusFilter ?? "all"}
            style="h-[40px] w-[170px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            onSelect={(id) => {
              setStatusFilter(id === "all" ? undefined : (id as ProjectStatus));
              setPage(1);
            }}
          />
          <Dropdown
            id="program-filter"
            title="All programs"
            data={programOptions}
            selectedId={programFilter != null ? String(programFilter) : "all"}
            style="h-[40px] w-[190px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            onSelect={(id) => {
              setProgramFilter(id === "all" ? undefined : Number(id));
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gca-border text-[12px] font-semibold tracking-[0.3px] text-gca-muted">
              <th className="flex-1 px-[16px] py-[10px]">Project</th>
              <th className="w-[180px] px-[16px] py-[10px]">Program</th>
              <th className="w-[170px] px-[16px] py-[10px]">PM</th>
              <th className="w-[110px] px-[16px] py-[10px]">Status</th>
              <th className="w-[140px] px-[16px] py-[10px]">Created</th>
              <th className="w-[120px] px-[16px] py-[10px]" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.project_id}
                className="border-b border-gca-border last:border-b-0 hover:bg-gca-page-bg"
              >
                <td
                  className="px-[16px] py-[12px]"
                  onClick={() => router.push(`/projects/${p.project_id}`)}
                >
                  <p className="text-[13px] font-medium text-gca-dark">{p.name}</p>
                  <p className="text-[12px] text-gca-muted">{p.client_name ?? "—"}</p>
                </td>
                <td className="px-[16px] py-[12px] text-[13px] text-gca-dark">
                  {p.program_name ?? "—"}
                </td>
                <td className="px-[16px] py-[12px] text-[13px] text-gca-dark">
                  {p.main_pm_name ?? "—"}
                </td>
                <td
                  className={`px-[16px] py-[12px] text-[13px] font-medium ${STATUS_STYLES[p.status]}`}
                >
                  {STATUS_LABELS[p.status]}
                </td>
                <td className="px-[16px] py-[12px] text-[13px] text-gca-dark">
                  {new Date(p.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center gap-[8px]">
                    {/* <button
                      onClick={() => router.push(`/projects/${p.project_id}`)}
                      title="View project"
                      className="flex size-[34px] items-center justify-center rounded-[8px] border border-gca-border text-gca-show hover:bg-white"
                    >
                      <Eye className="size-[16px]" />
                    </button> */}
                    <button
                      onClick={() => router.push(`/admin/projects/${p.project_id}/edit`)}
                      title="Edit project"
                      className="flex size-[34px] items-center justify-center rounded-[8px] text-gca-show hover:bg-white"
                    >
                      <Pencil className="size-[14px]" />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      title="Delete project"
                      className="flex size-[34px] items-center justify-center rounded-[8px] text-error-text hover:bg-error-bg"
                    >
                      <Trash2 className="size-[14px]" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-[16px] py-[24px] text-center text-[13px] text-gca-muted"
                >
                  No projects found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages || 1}
          perPage={limit}
          total={data.total}
          onPageChange={setPage}
          onPerPageChange={(p) => {
            setLimit(p);
            setPage(1);
          }}
          label="projects"
        />
      )}

      {deleting && <DeleteProjectModal project={deleting} onClose={() => setDeleting(null)} />}
    </main>
  );
}
