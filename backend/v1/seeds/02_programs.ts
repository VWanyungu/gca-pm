import type { Knex } from 'knex';

export interface ProgramSeed {
  program_id: number;
  name: string;
  is_active: boolean;
}

export const PROGRAM_IDS = {
  BULK_IMPORT_AND_WHOLESALE: 1,
  OPEN_ACCESS_BOTTLING_PLANT: 2,
  AUTOGAS: 3,
  RETICULATION: 4,
  INDUSTRIAL_AND_CONSTRUCTION: 5,
  LPG_MARKETPLACE: 6,
  VULCAN: 7,
  SMART_METERING: 8,
};

export const SEEDED_PROGRAMS: ProgramSeed[] = [
  { program_id: PROGRAM_IDS.BULK_IMPORT_AND_WHOLESALE,   name: 'Bulk import and wholesale',   is_active: true },
  { program_id: PROGRAM_IDS.OPEN_ACCESS_BOTTLING_PLANT,  name: 'Open Access Bottling Plant',  is_active: true },
  { program_id: PROGRAM_IDS.AUTOGAS,                     name: 'Autogas',                     is_active: true },
  { program_id: PROGRAM_IDS.RETICULATION,                name: 'Reticulation',                is_active: true },
  { program_id: PROGRAM_IDS.INDUSTRIAL_AND_CONSTRUCTION, name: 'Industrial and Construction', is_active: true },
  { program_id: PROGRAM_IDS.LPG_MARKETPLACE,             name: 'LPG Marketplace',             is_active: true },
  { program_id: PROGRAM_IDS.VULCAN,                      name: 'Vulcan',                      is_active: true },
  { program_id: PROGRAM_IDS.SMART_METERING,              name: 'Smart Metering',              is_active: true },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('programs')
    .insert(SEEDED_PROGRAMS)
    .onConflict('program_id')
    .merge({
      name: knex.raw('EXCLUDED.name'),
      is_active: knex.raw('EXCLUDED.is_active'),
    });

  // Keep the identity sequence past the explicit seed IDs so API inserts don't collide.
  await knex.raw(
    `SELECT setval(pg_get_serial_sequence('programs','program_id'), (SELECT MAX(program_id) FROM programs))`,
  );
}
