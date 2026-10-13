import type { RoleGrant, RoleName, ScopeType } from "@/contexts/auth-context";

interface Permission {
  role: RoleName;
  scopeType: ScopeType;
}

export function canAccess(
  userRoles: RoleGrant[] | undefined,
  required: Permission[],
  context?: { projectId?: string; programId?: string },
): boolean {
  if (!userRoles?.length) return false;

  return userRoles.some(
    (grant) =>
      (grant.role === "Admin" && grant.scope_type === "global") ||
      required.some(
        (req) =>
          grant.role === req.role &&
          grant.scope_type === req.scopeType &&
          (req.scopeType !== "program" || grant.program_id === context?.programId) &&
          (req.scopeType !== "project" || grant.project_id === context?.projectId),
      ),
  );
}

export const CAN_CREATE_PROJECT: Permission[] = [
  { role: "ProjectCreator", scopeType: "global" },
  { role: "Admin", scopeType: "global" },
  { role: "ExCo", scopeType: "global" },
];

export const CAN_LIST_PROJECTS: Permission[] = [
  { role: "Admin", scopeType: "global" },
  { role: "ExCo", scopeType: "global" },
  { role: "ProjectCreator", scopeType: "global" },
  { role: "PM", scopeType: "global" },
  { role: "Planner", scopeType: "global" },
  { role: "SiteEngineer", scopeType: "global" },
];
