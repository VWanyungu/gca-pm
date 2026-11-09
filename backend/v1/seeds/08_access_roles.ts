import type { Knex } from 'knex';

interface AccessRoleSeed {
  name: string;
  sort_order: number;
}

// Mirrors the migration's seed so `knex seed:run` is self-contained after a fresh migrate cycle.
// is_system is deliberately not merged here — the migration's flag stays authoritative.
export const SEEDED_ACCESS_ROLES: AccessRoleSeed[] = [
  { name: 'PM', sort_order: 1 },
  { name: 'Planner', sort_order: 2 },
  { name: 'SiteEngineer', sort_order: 3 },
  { name: 'ExCo', sort_order: 4 },
  { name: 'Admin', sort_order: 5 },
  { name: 'ProjectCreator', sort_order: 6 },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('access_role')
    .insert(SEEDED_ACCESS_ROLES.map((r) => ({ ...r, is_system: true, is_active: true })))
    .onConflict('name')
    .merge({
      sort_order: knex.raw('EXCLUDED.sort_order'),
    });
}
