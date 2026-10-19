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
      required.some((req) => satisfies(grant, req, context)),
  );
}

/**
 * The wider scope contains the narrower one: a global PM is a PM of every project, so a
 * PM@global satisfies anything asking for PM@project. A project-scoped grant never satisfies
 * a requirement for a global one, which stays the stronger ask.
 *
 * This mirrors the backend's authorize() middleware exactly. If they disagree, the UI either
 * hides a control the API would have allowed, or offers one the API rejects with a 403.
 */
function satisfies(
  grant: RoleGrant,
  req: Permission,
  context?: { projectId?: string; programId?: string },
): boolean {
  if (grant.role !== req.role) return false;
  if (grant.scope_type === "global") return true;
  if (grant.scope_type !== req.scopeType) return false;
  if (req.scopeType === "program") return grant.program_id === context?.programId;
  if (req.scopeType === "project") return grant.project_id === context?.projectId;
  return true;
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

export const CAN_MANAGE_PROJECT: Permission[] = [
  { role: "Admin", scopeType: "global" },
  { role: "ExCo", scopeType: "global" },
  { role: "PM", scopeType: "project" },
];

/**
 * AC-SCH-01: uploading a schedule is the Planner's job, not the PM's. Admin@global is allowed
 * everywhere by canAccess, and a Planner@global covers every project.
 *
 * Kept separate from CAN_MANAGE_PROJECT so the Upload button appears exactly where the API
 * will accept the upload.
 */
export const CAN_UPLOAD_SCHEDULE: Permission[] = [{ role: "Planner", scopeType: "project" }];

export const CAN_VIEW_PROJECT: Permission[] = [
  { role: "Admin", scopeType: "global" },
  { role: "ExCo", scopeType: "global" },
  { role: "ProjectCreator", scopeType: "global" },
  { role: "PM", scopeType: "project" },
  { role: "Planner", scopeType: "project" },
  { role: "SiteEngineer", scopeType: "project" },
];

export const CAN_RAISE_CHANGE_REQUEST: Permission[] = [
  { role: "PM", scopeType: "project" },
  { role: "SiteEngineer", scopeType: "project" },
];

export const CAN_DECIDE_CHANGE_REQUEST: Permission[] = [{ role: "ExCo", scopeType: "global" }];

export const CAN_MANAGE_USERS: Permission[] = [{ role: "Admin", scopeType: "global" }];

/**
 * AC-DPR-01: create/edit/submit requires SiteEngineer@project or Admin@global. Mirrors
 * `canCreateOrEdit` in `backend/v1/routers/dprRouter.ts` exactly.
 */
export const CAN_CREATE_DPR: Permission[] = [{ role: "SiteEngineer", scopeType: "project" }];
