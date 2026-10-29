import type { Knex } from 'knex';

export const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
  EXCO: '10000000-0000-0000-0000-000000000003',
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

// Global governance grants only. Project-scoped grants live alongside the
// projects that need them — the real portfolio's in 17_real_portfolio_data.ts.
export const SEEDED_ROLES: RoleSeedEntry[] = [
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
