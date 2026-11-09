"use client";

import { useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";

/**
 * Role gate only — shared by both the bottom-tab screens ((tabs)/) and the full-bleed DPR
 * wizard, which has its own sticky footer instead of the tab bar.
 *
 * This can't use `canAccess(user.role, CAN_CREATE_DPR)` the way `admin/layout.tsx` uses
 * `CAN_MANAGE_USERS` — `CAN_CREATE_DPR` is project-scoped (AC-DPR-01: SiteEngineer@project),
 * and `canAccess` needs a `projectId` in its `context` to match a project-scoped grant. This
 * top-level `/engineer` area isn't tied to one project yet (it lists all of the engineer's
 * assigned projects), so the gate here just checks "does this user hold a SiteEngineer grant
 * at all" — the real per-project check still happens API-side on every DPR write.
 */
function RoleGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const isSiteEngineer = user?.role?.some(
    (grant) =>
      grant.role === "SiteEngineer" || (grant.role === "Admin" && grant.scope_type === "global"),
  );

  if (!isSiteEngineer) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gca-page-bg p-[40px]">
        <p className="text-[14px] text-gca-muted">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-gca-page-bg">
      <div className="flex min-h-screen w-full max-w-[480px] flex-col bg-gca-page-bg">
        {children}
      </div>
    </div>
  );
}

export default function EngineerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <RoleGate>{children}</RoleGate>
    </ProtectedRoute>
  );
}
