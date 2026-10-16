"use client";

import { useState } from "react";
import { UserForm } from "@/components/admin/user-form";
import { DeactivateUserModal } from "@/components/admin/deactivate-user-modal";
import { useAdminUser } from "@/components/admin/use-admin-users-data";

export default function EditUserView({ userId }: { userId: string }) {
  const { data: user } = useAdminUser(userId);
  const [showStatusModal, setShowStatusModal] = useState(false);

  if (!user) return null;

  return (
    <main className="w-full max-w-[1200px] p-[40px]">
      <div className="mb-[16px] flex justify-end gap-[12px]">
        <button
          onClick={() => setShowStatusModal(true)}
          className={`rounded-[8px] px-[14px] py-[8px] text-[13px] font-medium ${
            user.status === "active" ? "border border-gca-border bg-white text-error-text" : "bg-gca-green text-white"
          }`}
        >
          {user.status === "active" ? "Deactivate" : "Reactivate"}
        </button>
      </div>

      <UserForm editing={user} />

      {showStatusModal && <DeactivateUserModal user={user} onClose={() => setShowStatusModal(false)} />}
    </main>
  );
}
