"use client";

import { useInvalidateUserSessions } from "./use-admin-users-data";
import type { AdminUserDetail } from "./types";

export function InvalidateSessionsModal({
  user,
  onClose,
}: {
  user: AdminUserDetail;
  onClose: () => void;
}) {
  const invalidateSessions = useInvalidateUserSessions(user.id);

  async function handleConfirm() {
    await invalidateSessions.mutateAsync();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-[rgba(24,48,31,0.45)]" onClick={onClose} />
      <div className="relative m-6 md:m-0 w-[392px] max-w-full rounded-[12px] bg-gca-surface p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
        <h2 className="text-[18px] font-semibold text-gca-dark">
          Sign out {user.first_name} {user.last_name}?
        </h2>
        <p className="mt-[8px] text-[14px] text-gca-muted">
          They&rsquo;ll be signed out everywhere immediately and have to log in again.
        </p>

        <div className="mt-[24px] flex justify-end gap-[12px]">
          <button
            onClick={onClose}
            className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={invalidateSessions.isPending}
            className="rounded-[8px] bg-error-border px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent disabled:opacity-40"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
