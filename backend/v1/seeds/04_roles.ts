import type { Knex } from 'knex';

export const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
  EXCO: '10000000-0000-0000-0000-000000000003',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
  SITE_ENGINEER_2: '10000000-0000-0000-0000-000000000008',
};

export const PROJECT_IDS = {
  PROJECT_1: '20000000-0000-0000-0000-000000000001',
  PROJECT_2: '20000000-0000-0000-0000-000000000002',
  PROJECT_3: '20000000-0000-0000-0000-000000000003',
};

export interface RoleSeedEntry {
  attribute_id: string;
  user_id: string;
  role: 'PM' | 'Planner' | 'SiteEngineer' | 'ExCo' | 'Admin' | 'ProjectCreator';
  scope_type: 'global' | 'program' | 'project';
  program_id: number | null;
  project_id: string | null;
  granted_by: string;
}

export const SEEDED_ROLES: RoleSeedEntry[] = [
  // Global Access Roles
  {
    attribute_id: '30000000-0000-0000-0000-000000000001',
    user_id: USER_IDS.ADMIN,
    role: 'Admin',
    scope_type: 'global',
    program_id: null,
    project_id: null,
    granted_by: USER_IDS.ADMIN,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000002',
    user_id: USER_IDS.PROJECT_CREATOR,
    role: 'ProjectCreator',
    scope_type: 'global',
    program_id: null,
    project_id: null,
    granted_by: USER_IDS.ADMIN,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000003',
    user_id: USER_IDS.EXCO,
    role: 'ExCo',
    scope_type: 'global',
    program_id: null,
    project_id: null,
    granted_by: USER_IDS.ADMIN,
  },

  // Project 1 Scoped Roles
  {
    attribute_id: '30000000-0000-0000-0000-000000000004',
    user_id: USER_IDS.PM,
    role: 'PM',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_1,
    granted_by: USER_IDS.ADMIN,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000005',
    user_id: USER_IDS.PLANNER,
    role: 'Planner',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_1,
    granted_by: USER_IDS.PM,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000006',
    user_id: USER_IDS.SITE_ENGINEER,
    role: 'SiteEngineer',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_1,
    granted_by: USER_IDS.PM,
  },

  // Project 2 Scoped Roles
  {
    attribute_id: '30000000-0000-0000-0000-000000000007',
    user_id: USER_IDS.PM,
    role: 'PM',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_2,
    granted_by: USER_IDS.ADMIN,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000008',
    user_id: USER_IDS.PLANNER,
    role: 'Planner',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_2,
    granted_by: USER_IDS.PM,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000009',
    user_id: USER_IDS.SITE_ENGINEER_2,
    role: 'SiteEngineer',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_2,
    granted_by: USER_IDS.PM,
  },

  // Project 3 Scoped Roles
  {
    attribute_id: '30000000-0000-0000-0000-000000000010',
    user_id: USER_IDS.PM_2,
    role: 'PM',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_3,
    granted_by: USER_IDS.ADMIN,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000011',
    user_id: USER_IDS.PLANNER,
    role: 'Planner',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_3,
    granted_by: USER_IDS.PM_2,
  },
  {
    attribute_id: '30000000-0000-0000-0000-000000000012',
    user_id: USER_IDS.SITE_ENGINEER,
    role: 'SiteEngineer',
    scope_type: 'project',
    program_id: null,
    project_id: PROJECT_IDS.PROJECT_3,
    granted_by: USER_IDS.PM_2,
  },
];

export async function seed(knex: Knex): Promise<void> {
  const rolesToInsert = SEEDED_ROLES.map((r) => ({
    ...r,
    granted_at: knex.fn.now(),
  }));

  await knex('roles')
    .insert(rolesToInsert)
    .onConflict('attribute_id')
    .merge({
      user_id: knex.raw('EXCLUDED.user_id'),
      role: knex.raw('EXCLUDED.role'),
      scope_type: knex.raw('EXCLUDED.scope_type'),
      program_id: knex.raw('EXCLUDED.program_id'),
      project_id: knex.raw('EXCLUDED.project_id'),
      granted_by: knex.raw('EXCLUDED.granted_by'),
      revoked_at: null,
      revoked_by: null,
      revoke_reason: null,
    });
}
