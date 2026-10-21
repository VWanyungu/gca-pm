"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import Dropdown from "@/components/Dropdown";
import { Pagination } from "@/components/pagination";
import { useAdminUsers } from "@/components/admin/use-admin-users-data";
import { summarizeProjectAccess } from "@/components/admin/format";
import { ROLE_NAMES, type RoleName } from "@/components/admin/types";

const ROLE_OPTIONS = [
  { id: "all", name: "All roles" },
  ...ROLE_NAMES.map((r) => ({ id: r, name: r })),
];
const STATUS_OPTIONS = [
  { id: "all", name: "All statuses" },
  { id: "active", name: "Active" },
  { id: "deactivated", name: "Deactivated" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [roleFilter, setRoleFilter] = useState<RoleName | undefined>();
  const [statusFilter, setStatusFilter] = useState<"active" | "deactivated" | undefined>("active");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data } = useAdminUsers({
    page,
    limit,
    search: debouncedSearch || undefined,
    globalRole: roleFilter,
    status: statusFilter,
  });
  const users = data?.users ?? [];
  const pagination = data?.pagination;

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold text-gca-dark">Users</h1>
          <p className="text-[14px] text-gca-muted">
            {/* {pagination?.total ?? 0} users ·  */}
            {data?.activeCount ?? 0} users active
          </p>
        </div>
        <button
          onClick={() => router.push(`/admin/users/new?fresh=${Date.now()}`)}
          className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-white"
        >
          Add user
        </button>
      </div>

      <div className="flex items-center justify-between gap-[12px]">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search name or email"
          className="h-[40px] w-[320px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none placeholder:text-gca-muted"
        />
        <div className="flex items-center gap-[12px]">
          <Dropdown
            id="role-filter"
            title="All roles"
            data={ROLE_OPTIONS}
            selectedId={roleFilter ?? "all"}
            style="h-[40px] w-[180px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            onSelect={(id) => {
              setRoleFilter(id === "all" ? undefined : (id as RoleName));
              setPage(1);
            }}
          />
          <Dropdown
            id="status-filter"
            title="Active"
            data={STATUS_OPTIONS}
            selectedId={statusFilter ?? "all"}
            style="h-[40px] w-[160px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            onSelect={(id) => {
              setStatusFilter(id === "all" ? undefined : (id as "active" | "deactivated"));
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gca-border text-[12px] font-medium  tracking-[0.3px] text-gca-muted">
              <th className="flex-1 px-[16px] py-[10px]">Name</th>
              <th className="w-[140px] px-[16px] py-[10px]">Global role</th>
              <th className="w-[360px] px-[16px] py-[10px]">Project access</th>
              <th className="w-[140px] px-[16px] py-[10px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                onClick={() => router.push(`/admin/users/${u.id}/edit`)}
                className="cursor-pointer border-b border-gca-border last:border-b-0 hover:bg-gca-page-bg"
              >
                <td className="px-[16px] py-[12px]">
                  <p className="text-[13px] font-medium text-gca-dark">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-[12px] text-gca-muted">{u.email}</p>
                </td>
                <td className="px-[16px] py-[12px] text-[13px] text-gca-dark">
                  {u.global_role ?? "—"}
                </td>
                <td className="whitespace-pre-line px-[16px] py-[12px] text-[13px] text-gca-dark">
                  {summarizeProjectAccess(u.project_access)}
                </td>
                <td className="px-[16px] py-[12px] text-[13px]">
                  {u.status === "active" ? (
                    <span className="text-gca-green">Active</span>
                  ) : (
                    <span className="text-gca-muted">Deactivated</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-[16px] py-[24px] text-center text-[13px] text-gca-muted"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.pages || 1}
          perPage={limit}
          total={pagination.total}
          onPageChange={setPage}
          onPerPageChange={(p) => {
            setLimit(p);
            setPage(1);
          }}
          label="users"
        />
      )}
    </main>
  );
}
