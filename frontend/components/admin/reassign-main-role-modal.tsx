"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import Dropdown from "@/components/Dropdown";
import { useAssignableUsers, useProjectRoles, useReassignMainRole } from "./use-admin-users-data";

type MainRole = "PM" | "Planner";

interface ReassignMainRoleModalProps {
  projectId: string;
  projectName: string;
  role: MainRole;
  currentHolderId: string;
  currentHolderName: string;
  onClose: () => void;
}

const ROLE_TABS: { id: MainRole; label: string }[] = [
  { id: "PM", label: "Main PM" },
  { id: "Planner", label: "Main Planner" },
];

export function ReassignMainRoleModal({
  projectId,
  projectName,
  role: initialRole,
  currentHolderId,
  currentHolderName,
  onClose,
}: ReassignMainRoleModalProps) {
  const [role, setRole] = useState<MainRole>(initialRole);
  const [newUserId, setNewUserId] = useState("");
  const [reason, setReason] = useState("");

  const { data: projectRoles = [] } = useProjectRoles(projectId);
  const { data: allUsers = [] } = useAssignableUsers();
  const reassign = useReassignMainRole();

  // Role changed from the tab after opening: current holder for the newly-selected role.
  const currentHolder =
    role === initialRole
      ? { id: currentHolderId, name: currentHolderName }
      : (() => {
          const holders = projectRoles.filter((r) => r.role === role);
          const main = [...holders].sort((a, b) => new Date(a.granted_at).getTime() - new Date(b.granted_at).getTime())[0];
          return main ? { id: main.user_id, name: `${main.first_name} ${main.last_name}` } : null;
        })();

  // Eligible candidates: other people already holding that role on the project, falling back to
  // every user (lets you promote someone fresh), excluding whoever currently holds it.
  const holdersOfRole = projectRoles.filter((r) => r.role === role && r.user_id !== currentHolder?.id);
  const candidates = (
    holdersOfRole.length
      ? holdersOfRole.map((r) => ({ id: r.user_id, name: `${r.first_name} ${r.last_name}` }))
      : allUsers.filter((u) => u.id !== currentHolder?.id).map((u) => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }))
  );

  async function handleReassign() {
    if (!newUserId) return;
    await reassign.mutateAsync({ projectId, role, newUserId, reason: reason.trim() || null });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={onClose} />
      <div className="relative w-[392px] max-w-full rounded-[12px] bg-gca-surface p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
        <h2 className="text-[18px] font-semibold text-gca-dark">Reassign main role</h2>

        <div className="mt-[16px] flex flex-col gap-[12px]">
          <div>
            <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Project</p>
            <Dropdown
              id="reassign-project"
              title={projectName}
              data={[{ id: projectId, name: projectName }]}
              selectedId={projectId}
              style="h-[42px] w-full rounded-[8px] border border-gca-border bg-gca-page-bg px-[12px] text-[14px] text-gca-dark"
            />
          </div>

          <div>
            <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Role</p>
            <div className="flex gap-[3px] rounded-[8px] bg-gca-page-bg p-[3px]">
              {ROLE_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setRole(t.id);
                    setNewUserId("");
                  }}
                  className={`flex-1 rounded-[6px] py-[8px] text-[13px] font-medium ${
                    role === t.id ? "bg-gca-surface text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]" : "text-gca-show"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-[4px] text-[13px] font-medium text-gca-dark">Current</p>
            <p className="text-[14px] font-medium text-gca-dark">{currentHolder?.name ?? "—"}</p>
          </div>

          <div>
            <p className="mb-[6px] text-[13px] font-medium text-gca-dark">
              New {role === "PM" ? "main PM" : "main Planner"} <span className="text-gca-warning">*</span>
            </p>
            <Dropdown
              id="reassign-new-holder"
              title="Choose a user"
              data={candidates}
              selectedId={newUserId}
              style="h-[42px] w-full rounded-[8px] border border-gca-border px-[12px] text-[14px] text-gca-dark"
              onSelect={(id) => setNewUserId(id)}
            />
          </div>

          <div>
            <p className="mb-[6px] text-[13px] font-medium text-gca-dark">Reason</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
              className="h-[80px] w-full resize-none rounded-[8px] border border-gca-border px-[12px] py-[10px] text-[14px] text-gca-dark outline-none focus:border-gca-green"
            />
          </div>

          <p className="text-[12px] text-gca-muted">
            They get {role === "PM" ? "PM" : "Planner"} access to this project.
          </p>
        </div>

        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReassign}
            disabled={!newUserId || reassign.isPending}
            className="relative flex items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-40"
          >
            <span className={reassign.isPending ? "invisible" : undefined}>Reassign</span>
            {reassign.isPending && (
              <LoaderCircle
                className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                aria-label="Reassigning"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
