"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  useAccessRoles,
  useCreateAccessRole,
  useUpdateAccessRole,
  useDeactivateAccessRole,
  type AccessRole,
} from "@/components/admin/use-access-roles-data";

export default function AdminRolesPage() {
  const { data: roles = [] } = useAccessRoles(true);
  const createRole = useCreateAccessRole();
  const [name, setName] = useState("");

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createRole.mutateAsync({
      name: trimmed,
      sort_order: (Math.max(0, ...roles.map((r) => r.sort_order)) || 0) + 10,
    });
    setName("");
  }

  return (
    <main className="flex w-full overflow-hidden md:max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
      <div>
        <h1 className="text-[24px] font-semibold text-gca-dark">Roles</h1>
        <p className="text-[14px] text-gca-muted">
          Roles available when granting user access. System roles are built into the app and can
          only be activated or deactivated.
        </p>
      </div>

      <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New role name"
          className="h-[40px] w-full sm:w-[280px] rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={createRole.isPending || !name.trim()}
          className="relative flex h-[40px] items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] text-[14px] font-medium text-gca-on-accent disabled:opacity-60"
        >
          <span className={createRole.isPending ? "invisible" : undefined}>Add role</span>
          {createRole.isPending && (
            <LoaderCircle
              className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
              aria-label="Adding role"
            />
          )}
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] overflow-scroll">
        <table className="w-max md:w-full text-left">
          <thead>
            <tr className="border-b border-gca-border text-[12px] font-medium tracking-[0.3px] text-gca-muted">
              <th className="w-max md:w-[300px] px-[16px] py-[10px]">Name</th>
              <th className="w-max md:w-[140px] px-[16px] py-[10px]">Type</th>
              <th className="w-max md:w-[140px] px-[16px] py-[10px]">Status</th>
              <th className="w-max md:w-[120px] px-[16px] py-[10px]" />
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <RoleRow key={role.access_role_id} role={role} />
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={4} className="px-[16px] py-[24px] text-center text-[13px] text-gca-muted">
                  No roles found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function RoleRow({ role }: { role: AccessRole }) {
  const updateRole = useUpdateAccessRole(role.access_role_id);
  const deactivateRole = useDeactivateAccessRole();
  const [editingName, setEditingName] = useState<string | null>(null);

  async function saveName() {
    const trimmed = editingName?.trim();
    if (!trimmed || trimmed === role.name) {
      setEditingName(null);
      return;
    }
    await updateRole.mutateAsync({ name: trimmed });
    setEditingName(null);
  }

  return (
    <tr className="border-b border-gca-border last:border-b-0">
      <td className="px-[16px] py-[12px] text-[13px] text-gca-dark">
        {editingName !== null ? (
          <input
            autoFocus
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="h-[32px] w-full rounded-[6px] border border-gca-border px-[8px] text-[13px] outline-none"
          />
        ) : (
          <button
            type="button"
            disabled={role.is_system}
            onClick={() => setEditingName(role.name)}
            className="text-left disabled:cursor-default"
          >
            {role.name}
          </button>
        )}
      </td>
      <td className="px-[16px] py-[12px] text-[13px] text-gca-muted">
        {role.is_system ? "System" : "Custom"}
      </td>
      <td className="px-[16px] py-[12px] text-[13px]">
        {role.is_active ? (
          <span className="text-gca-green">Active</span>
        ) : (
          <span className="text-gca-muted">Inactive</span>
        )}
      </td>
      <td className="px-[16px] py-[12px] text-right">
        <button
          type="button"
          disabled={(role.is_system && role.is_active) || deactivateRole.isPending || updateRole.isPending}
          onClick={() =>
            role.is_active
              ? deactivateRole.mutate(role.access_role_id)
              : updateRole.mutate({ is_active: true })
          }
          className="inline-flex items-center gap-[6px] text-[13px] font-medium text-error-text disabled:opacity-40"
        >
          <span className="flex size-[13px] shrink-0 items-center justify-center">
            {(deactivateRole.isPending || updateRole.isPending) && (
              <LoaderCircle className="size-[13px] animate-spin" />
            )}
          </span>
          {role.is_active ? "Deactivate" : "Activate"}
        </button>
      </td>
    </tr>
  );
}
