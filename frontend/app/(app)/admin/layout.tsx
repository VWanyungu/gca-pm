"use client";

import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_USERS } from "@/lib/access-control";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

// Auth itself is gated by <ProtectedRoute> in app/(app)/layout.tsx — this only adds the
// role check on top of it.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!canAccess(user?.role, CAN_MANAGE_USERS)) {
    return (
      <div className="flex w-full min-w-0 justify-center p-[20px] md:p-[40px]">
        <p className="text-[14px] text-gca-muted">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <AdminSidebar />
      <div className="flex w-full min-w-0 justify-center">{children}</div>
    </div>
  );
}
