"use client";

import { useState } from "react";
import Dropdown from "@/components/Dropdown";
import {
  ROLE_NAMES,
  type AdminUserDetail,
  type RoleGrantDetail,
  type RoleName,
  type ScopeType,
} from "./types";
import {
  useGrantRole,
  useRevokeRole,
  useProgramsList,
  useProjectsList,
} from "./use-admin-users-data";
import { ReassignMainRoleModal } from "./reassign-main-role-modal";

const LEVELS: { id: ScopeType; label: string }[] = [
  { id: "global", label: "Global" },
  { id: "program", label: "Program" },
  { id: "project", label: "Project" },
];

/**
 * Current grants + add-access form. Rendered inline in the edit-user page's "Project access"
 * card (no scrim/slide-over — there's no other place this is used, so there's no separate
 * standalone wrapper to keep alive).
 */
export function AccessPanelContent({ user }: { user: AdminUserDetail }) {
  const [role, setRole] = useState<RoleName>("PM");
  const [level, setLevel] = useState<ScopeType>("global");
  const [scopeId, setScopeId] = useState<string>("");
  const [reassigning, setReassigning] = useState<RoleGrantDetail | null>(null);

  const grantRole = useGrantRole(user.id);
  const revokeRole = useRevokeRole(user.id);
  const { data: programs = [] } = useProgramsList();
  const { data: projects = [] } = useProjectsList();

  const scopeOptions =
    level === "program"
      ? programs.map((p) => ({ id: String(p.program_id), name: p.name }))
      : level === "project"
        ? projects.map((p) => ({ id: p.project_id, name: p.name }))
        : [];

  async function handleAdd() {
    if (level !== "global" && !scopeId) return;
    await grantRole.mutateAsync({
      role,
      scopeType: level,
      programId: level === "program" ? Number(scopeId) : null,
      projectId: level === "project" ? scopeId : null,
    });
    setScopeId("");
  }

  return (
    <div className="flex h-full flex-col">
      <p className="mb-[8px] shrink-0 text-[12px] font-semibold uppercase tracking-[0.3px] text-gca-muted">
        Current
      </p>
      <div className="mb-[16px] md:flex-1 overflow-y-auto">
        {user.roles.length === 0 && (
          <p className="py-[12px] text-[13px] text-gca-muted">No roles granted.</p>
        )}
        {user.roles.map((grant) => (
          <div
            key={grant.attribute_id}
            className="flex items-center justify-between border-t border-gca-border py-[12px]"
          >
            <div>
              <div className="flex items-center gap-[6px]">
                <p className="text-[14px] font-medium text-gca-dark">{grant.role}</p>
                {grant.is_main && (
                  <span className="rounded-full bg-gca-badge-bg px-[8px] py-[2px] text-[11px] font-medium text-gca-badge-text">
                    Main {grant.role}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gca-muted">
                {grant.scope_type === "global"
                  ? "Global"
                  : `${grant.scope_name ?? "—"} · ${grant.scope_type}`}
              </p>
            </div>
            {grant.is_main ? (
              <button
                type="button"
                onClick={() => setReassigning(grant)}
                className="text-[13px] text-gca-muted"
              >
                Reassign first
              </button>
            ) : (
              <button
                type="button"
                onClick={() => revokeRole.mutate(grant.attribute_id)}
                disabled={revokeRole.isPending}
                className="text-[13px] font-medium text-error-text disabled:opacity-60"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="mb-[8px] shrink-0 text-[12px] font-semibold uppercase tracking-[0.3px] text-gca-muted">
        Add access
      </p>
      <div className="flex shrink-0 flex-col gap-[12px]">
        <Dropdown
          id="add-access-role"
          title="Role"
          data={ROLE_NAMES.map((r) => ({ id: r, name: r }))}
          selectedId={role}
          style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
          onSelect={(id) => setRole(id as RoleName)}
        />

        <div className="flex gap-[3px] rounded-[8px] bg-gca-page-bg p-[3px]">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLevel(l.id);
                setScopeId("");
              }}
              className={`flex-1 rounded-[6px] py-[8px] text-[13px] font-medium ${
                level === l.id
                  ? "bg-white text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                  : "text-gca-show"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {level !== "global" && (
          <Dropdown
            id="add-access-scope"
            title={level === "program" ? "Choose program" : "Choose project"}
            data={scopeOptions}
            selectedId={scopeId}
            style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
            onSelect={(id) => setScopeId(id)}
          />
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={grantRole.isPending || (level !== "global" && !scopeId)}
          className="w-full rounded-[8px] bg-gca-green px-[14px] py-[10px] text-[14px] font-medium text-white disabled:opacity-60"
        >
          Add access
        </button>
      </div>

      {reassigning && reassigning.project_id && (
        <ReassignMainRoleModal
          projectId={reassigning.project_id}
          projectName={reassigning.scope_name ?? "Project"}
          role={reassigning.role as "PM" | "Planner"}
          currentHolderId={user.id}
          currentHolderName={`${user.first_name} ${user.last_name}`}
          onClose={() => setReassigning(null)}
        />
      )}
    </div>
  );
}
