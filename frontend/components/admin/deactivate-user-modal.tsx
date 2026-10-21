"use client";

import { useState } from "react";
import type { AdminUserDetail, RoleGrantDetail } from "./types";
import { useSetUserStatus } from "./use-admin-users-data";
import { mainRoleWarning } from "./format";
import { ReassignMainRoleModal } from "./reassign-main-role-modal";

export function DeactivateUserModal({
  user,
  onClose,
}: {
  user: AdminUserDetail;
  onClose: () => void;
}) {
  const setStatus = useSetUserStatus(user.id);
  const deactivating = user.status === "active";
  const [reassigning, setReassigning] = useState<RoleGrantDetail | null>(null);

  const mainGrants = user.roles.filter((r) => r.is_main);
  const pmCount = mainGrants.filter((r) => r.role === "PM").length;
  const plannerCount = mainGrants.filter((r) => r.role === "Planner").length;
  const blocked = deactivating && mainGrants.length > 0;

  async function handleConfirm() {
    if (blocked) return;
    await setStatus.mutateAsync(deactivating ? "deactivated" : "active");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={onClose} />
      <div className="relative m-6 md:m-0  w-[392px] max-w-full rounded-[12px] bg-white p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
        <h2 className="text-[18px] font-semibold text-gca-dark">
          {deactivating
            ? `Deactivate ${user.first_name} ${user.last_name}?`
            : `Reactivate ${user.first_name} ${user.last_name}?`}
        </h2>
        <p className="mt-[8px] text-[14px] text-gca-muted">
          {deactivating
            ? "They lose access straight away. Their records stay."
            : "They regain access immediately."}
        </p>

        {blocked && (
          <div className="mt-[16px] flex flex-col gap-[8px]">
            {pmCount > 0 && (
              <div className="flex items-center justify-between rounded-[8px] bg-[#fff4e5] px-[12px] py-[10px]">
                <p className="text-[13px] font-medium text-gca-warning">
                  {mainRoleWarning("PM", pmCount)}
                </p>
                <button
                  onClick={() => setReassigning(mainGrants.find((r) => r.role === "PM") ?? null)}
                  className="text-[13px] font-semibold text-gca-green"
                >
                  Reassign
                </button>
              </div>
            )}
            {plannerCount > 0 && (
              <div className="flex items-center justify-between rounded-[8px] bg-[#fff4e5] px-[12px] py-[10px]">
                <p className="text-[13px] font-medium text-gca-warning">
                  {mainRoleWarning("Planner", plannerCount)}
                </p>
                <button
                  onClick={() =>
                    setReassigning(mainGrants.find((r) => r.role === "Planner") ?? null)
                  }
                  className="text-[13px] font-semibold text-gca-green"
                >
                  Reassign
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={setStatus.isPending || blocked}
            className={`rounded-[8px] px-[16px] py-[10px] text-[14px] font-medium text-white disabled:opacity-40 ${
              deactivating ? "bg-error-border" : "bg-gca-green"
            }`}
          >
            {deactivating ? "Deactivate" : "Reactivate"}
          </button>
        </div>
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
