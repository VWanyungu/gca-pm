"use client";

import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_USERS } from "@/lib/access-control";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  // No app-wide ProtectedRoute/unauthorized convention exists yet (checked app/(app)/layout.tsx) —
  // gate inline here, matching the simplest pattern available.
  if (!isAuthenticated || !canAccess(user?.role, CAN_MANAGE_USERS)) {
    return (
      <div className="flex w-full justify-center p-[40px]">
        <p className="text-[14px] text-gca-muted">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <AdminSidebar />
      <div className="flex w-full justify-center">{children}</div>
    </div>
  );
}
