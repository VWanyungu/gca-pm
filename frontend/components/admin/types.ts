export type RoleName = "PM" | "Planner" | "SiteEngineer" | "ExCo" | "Admin" | "ProjectCreator";
export type ScopeType = "global" | "program" | "project";

export const ROLE_NAMES: RoleName[] = ["PM", "Planner", "SiteEngineer", "ExCo", "Admin", "ProjectCreator"];

export interface AdminUserListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string | null;
  phone_number: string | null;
  status: "active" | "deactivated";
  is_verified: boolean;
  last_login: string | null;
  created_at: string;
  global_role: RoleName | null;
  project_access: { role: RoleName; scopeName: string }[];
}

export interface RoleGrantDetail {
  attribute_id: string;
  user_id: string;
  role: RoleName;
  scope_type: ScopeType;
  program_id: number | null;
  project_id: string | null;
  granted_by: string;
  granted_at: string;
  scope_name: string | null;
  // True when this grant is the project's main PM/Planner (earliest-granted active holder of
  // that role on the project — there's no is_main column; see backend Users.getUserById).
  is_main: boolean;
}

export interface AdminUserDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  status: "active" | "deactivated";
  global_role: RoleName | null;
  roles: RoleGrantDetail[];
}

export type ProjectStatus = "active" | "on_hold" | "complete" | "cancelled" | "deleted";

export interface AdminProjectListItem {
  project_id: string;
  project_code: string;
  name: string;
  client_name: string | null;
  program_id: number;
  program_name: string | null;
  main_pm_name: string | null;
  status: ProjectStatus;
  created_at: string;
}

export interface AdminProjectDetail {
  project_id: string;
  project_code: string;
  name: string;
  client_name: string | null;
  program_id: number;
  site_location: string | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  status: ProjectStatus;
  created_at: string;
}
