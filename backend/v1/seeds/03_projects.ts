import type { Knex } from 'knex';

// Mirror of PROGRAM_IDS from 02_programs.ts (inlined — knex ESM seeds don't
// cross-import cleanly here). Keep in sync if programs are reordered.
const PROGRAM_IDS = {
  BULK_IMPORT_AND_WHOLESALE: 1,
  AUTOGAS: 3,
  RETICULATION: 4,
};

export const PROJECT_IDS = {
  PROJECT_1: '20000000-0000-0000-0000-000000000001',
  PROJECT_2: '20000000-0000-0000-0000-000000000002',
  PROJECT_3: '20000000-0000-0000-0000-000000000003',
};

export const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
  SITE_ENGINEER_2: '10000000-0000-0000-0000-000000000008',
};

export const SEEDED_PROJECTS = [
  {
    project_id: PROJECT_IDS.PROJECT_1,
    project_code: '001-001.2026',
    name: 'Mombasa Port LPG Bulk Storage Terminal',
    program_id: PROGRAM_IDS.BULK_IMPORT_AND_WHOLESALE,
    client_name: 'Kenya Pipeline Company',
    country: 'Kenya',
    site_location: 'Kipevu Oil Terminal, Mombasa',
    site_lat: -4.043477,
    site_lng: 39.668206,
    timezone: 'Africa/Nairobi',
    is_civil: true,
    is_mechanical: true,
    is_electrical: true,
    expected_start_date: '2026-01-15',
    expected_end_date: '2026-11-30',
    estimated_value: 18500000.0,
    currency: 'USD',
    status: 'active',
    created_by: USER_IDS.PROJECT_CREATOR,
  },
  {
    project_id: PROJECT_IDS.PROJECT_2,
    project_code: '001-002.2026',
    name: 'Nairobi Industrial Area Gas Reticulation Loop',
    program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Ministry of Energy & Petroleum',
    country: 'Kenya',
    site_location: 'Enterprise Road, Industrial Area, Nairobi',
    site_lat: -1.3115,
    site_lng: 36.8521,
    timezone: 'Africa/Nairobi',
    is_civil: true,
    is_mechanical: true,
    is_electrical: false,
    expected_start_date: '2026-03-01',
    expected_end_date: '2026-12-15',
    estimated_value: 9200000.0,
    currency: 'USD',
    status: 'active',
    created_by: USER_IDS.PROJECT_CREATOR,
  },
  {
    project_id: PROJECT_IDS.PROJECT_3,
    project_code: '002-001.2026',
    name: 'Eldoret-Kisumu CNG Daughter Station',
    program_id: PROGRAM_IDS.AUTOGAS,
    client_name: 'TotalEnergies Marketing Kenya',
    country: 'Kenya',
    site_location: 'Eldoret Depot, Highway Junction, Eldoret',
    site_lat: 0.514277,
    site_lng: 35.26978,
    timezone: 'Africa/Nairobi',
    is_civil: true,
    is_mechanical: true,
    is_electrical: true,
    expected_start_date: '2026-04-01',
    expected_end_date: '2027-01-31',
    estimated_value: 6400000.0,
    currency: 'USD',
    status: 'active',
    created_by: USER_IDS.ADMIN,
  },
];

export async function seed(knex: Knex): Promise<void> {
  let holidayCalendarId: number | null = null;
  if (await knex.schema.hasTable('holiday_calendar')) {
    const calendarRow = await knex('holiday_calendar')
      .select('calendar_id')
      .first();
    if (calendarRow) {
      holidayCalendarId = calendarRow.calendar_id;
    }
  }

  const projectsToInsert = SEEDED_PROJECTS.map((project) => ({
    ...project,
    holiday_calendar_id: holidayCalendarId,
    dpr_expected_weekdays: knex.raw(`'{1,2,3,4,5,6}'::smallint[]`),
    updated_at: knex.fn.now(),
  }));

  await knex('projects')
    .insert(projectsToInsert)
    .onConflict('project_id')
    .merge({
      project_code: knex.raw('EXCLUDED.project_code'),
      name: knex.raw('EXCLUDED.name'),
      program_id: knex.raw('EXCLUDED.program_id'),
      client_name: knex.raw('EXCLUDED.client_name'),
      country: knex.raw('EXCLUDED.country'),
      site_location: knex.raw('EXCLUDED.site_location'),
      site_lat: knex.raw('EXCLUDED.site_lat'),
      site_lng: knex.raw('EXCLUDED.site_lng'),
      timezone: knex.raw('EXCLUDED.timezone'),
      is_civil: knex.raw('EXCLUDED.is_civil'),
      is_mechanical: knex.raw('EXCLUDED.is_mechanical'),
      is_electrical: knex.raw('EXCLUDED.is_electrical'),
      expected_start_date: knex.raw('EXCLUDED.expected_start_date'),
      expected_end_date: knex.raw('EXCLUDED.expected_end_date'),
      estimated_value: knex.raw('EXCLUDED.estimated_value'),
      currency: knex.raw('EXCLUDED.currency'),
      status: knex.raw('EXCLUDED.status'),
      holiday_calendar_id: holidayCalendarId,
      created_by: knex.raw('EXCLUDED.created_by'),
      updated_at: knex.fn.now(),
    });
}
