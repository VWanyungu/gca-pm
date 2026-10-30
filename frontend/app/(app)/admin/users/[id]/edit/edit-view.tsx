"use client";

import { useState } from "react";
import { UserForm } from "@/components/admin/user-form";
import { DeactivateUserModal } from "@/components/admin/deactivate-user-modal";
import { InvalidateSessionsModal } from "@/components/admin/invalidate-sessions-modal";
import { useAdminUser } from "@/components/admin/use-admin-users-data";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EditUserView({ userId }: { userId: string }) {
  const { data: user } = useAdminUser(userId);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInvalidateModal, setShowInvalidateModal] = useState(false);
  const router = useRouter();

  if (!user) return null;

  return (
    <main className="w-full max-w-[1200px] p-[20px] md:p-[40px]">
      <div className="mb-[16px] flex justify-between items-center gap-[12px]">
        <button
          onClick={() => router.push("/admin/users")}
          className="md:mb-[16px] text-[13px] font-medium text-gca-green flex gap-[6px] items-center hover: cursor-pointer"
        >
          <ArrowLeft size={18} /> Users
        </button>
        <div className="flex gap-[8px]">
          <button
            onClick={() => setShowInvalidateModal(true)}
            className="rounded-[8px] border border-gca-border bg-gca-surface px-[14px] py-[8px] text-[13px] font-medium text-gca-dark"
          >
            Sign out everywhere
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className={`rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium ${
              user.status === "active"
                ? "border border-gca-border bg-gca-surface text-error-text"
                : "bg-gca-green text-gca-on-accent"
            }`}
          >
            {user.status === "active" ? "Deactivate" : "Reactivate"}
          </button>
        </div>
      </div>

      <UserForm editing={user} />

      {showStatusModal && (
        <DeactivateUserModal user={user} onClose={() => setShowStatusModal(false)} />
      )}
      {showInvalidateModal && (
        <InvalidateSessionsModal user={user} onClose={() => setShowInvalidateModal(false)} />
      )}
    </main>
  );
}
