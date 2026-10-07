import type { Knex } from 'knex';

export const SEED_PASSWORD_HASH =
  '$2a$10$maT1oyfF3COMDjifizq7r.hGdKcbOV4UljqVjCbu7/ob4t5Q9UB02';

export const USER_IDS = {
  SYSTEM: '00000000-0000-0000-0000-000000000000',
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
  EXCO: '10000000-0000-0000-0000-000000000003',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
  SITE_ENGINEER_2: '10000000-0000-0000-0000-000000000008',
};

export async function seed(knex: Knex): Promise<void> {
  const users = [
    {
      id: USER_IDS.ADMIN,
      external_id: 'USR-0001',
      first_name: 'Arthur',
      last_name: 'Admin',
      email: 'admin@gasconnectafrica.com',
      username: 'admin',
      phone_number: '+254700000001',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.PROJECT_CREATOR,
      external_id: 'USR-0002',
      first_name: 'Claire',
      last_name: 'Creator',
      email: 'creator@gasconnectafrica.com',
      username: 'creator',
      phone_number: '+254700000002',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.EXCO,
      external_id: 'USR-0003',
      first_name: 'Edward',
      last_name: 'Exco',
      email: 'exco@gasconnectafrica.com',
      username: 'exco',
      phone_number: '+254700000003',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.PM,
      external_id: 'USR-0004',
      first_name: 'Peter',
      last_name: 'Mwangi',
      email: 'pm@gasconnectafrica.com',
      username: 'pm_user',
      phone_number: '+254700000004',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.PM_2,
      external_id: 'USR-0005',
      first_name: 'Patricia',
      last_name: 'Muthoni',
      email: 'pm2@gasconnectafrica.com',
      username: 'pm_muthoni',
      phone_number: '+254700000005',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.PLANNER,
      external_id: 'USR-0006',
      first_name: 'Paul',
      last_name: 'Kimani',
      email: 'planner@gasconnectafrica.com',
      username: 'planner',
      phone_number: '+254700000006',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.SITE_ENGINEER,
      external_id: 'USR-0007',
      first_name: 'Samuel',
      last_name: 'Otieno',
      email: 'site.engineer@gasconnectafrica.com',
      username: 'site_engineer',
      phone_number: '+254700000007',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
    {
      id: USER_IDS.SITE_ENGINEER_2,
      external_id: 'USR-0008',
      first_name: 'Sarah',
      last_name: 'Wanjiru',
      email: 'site.engineer2@gasconnectafrica.com',
      username: 'site_engineer2',
      phone_number: '+254700000008',
      password_hash: SEED_PASSWORD_HASH,
      status: 'active',
      is_verified: true,
      updated_at: knex.fn.now(),
    },
  ];

  await knex('users')
    .insert(users)
    .onConflict('id')
    .merge({
      external_id: knex.raw('EXCLUDED.external_id'),
      first_name: knex.raw('EXCLUDED.first_name'),
      last_name: knex.raw('EXCLUDED.last_name'),
      email: knex.raw('EXCLUDED.email'),
      password_hash: knex.raw('EXCLUDED.password_hash'),
      phone_number: knex.raw('EXCLUDED.phone_number'),
      status: knex.raw('EXCLUDED.status'),
      username: knex.raw('EXCLUDED.username'),
      is_verified: knex.raw('EXCLUDED.is_verified'),
      updated_at: knex.fn.now(),
    });

  // Ensure Admin user has global access role immediately
  if (await knex.schema.hasTable('roles')) {
    await knex('roles')
      .insert({
        attribute_id: '30000000-0000-0000-0000-000000000001',
        user_id: USER_IDS.ADMIN,
        role: 'Admin',
        scope_type: 'global',
        program_id: null,
        project_id: null,
        granted_by: USER_IDS.ADMIN,
        granted_at: knex.fn.now(),
      })
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
}
