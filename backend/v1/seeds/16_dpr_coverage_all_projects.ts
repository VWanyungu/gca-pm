import type { Knex } from 'knex';

// Extra DPR coverage for the current week (11-17 Oct 2026) so every project
// (not just Project 2) has DPR data to show on its Submit screen.
const USER_IDS = {
  PM_2: '10000000-0000-0000-0000-000000000005',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
};

const PROJECT_1 = '20000000-0000-0000-0000-000000000001';
const PROJECT_3 = '20000000-0000-0000-0000-000000000003';

export async function seed(knex: Knex): Promise<void> {
  const weather = await knex('weather_category')
    .select('weather_category_id')
    .where({ name: 'Clear' })
    .first<{ weather_category_id: number }>();

  if (!weather) throw new Error('Seeded Clear weather category was not found');

  await knex('dpr')
    .insert([
      // Project 1 (Mombasa) — stage 7, Construction, already has a DPR for
      // 2026-10-12; add the next day so its week isn't a single-day strip.
      {
        dpr_id: '53000000-0000-0000-0000-000000000020',
        dpr_ref: 'DPR-001-001-2026-20261013',
        project_id: PROJECT_1,
        stage_no: 7,
        report_date: '2026-10-13',
        site_location: 'Kipevu Oil Terminal, Mombasa',
        weather_category_id: weather.weather_category_id,
        effects_severity: 'minor',
        other_notes_text: 'Tank foundation rebar inspection passed.',
        status: 'submitted',
        author_id: USER_IDS.SITE_ENGINEER,
        submitted_by: USER_IDS.SITE_ENGINEER,
        submitted_at: '2026-10-13T20:05:00Z',
        is_late: true,
      },
      // Project 3 (Eldoret) — stage 3, Structuring & Financing, had none.
      {
        dpr_id: '53000000-0000-0000-0000-000000000021',
        dpr_ref: 'DPR-002-001-2026-20261012',
        project_id: PROJECT_3,
        stage_no: 3,
        report_date: '2026-10-12',
        site_location: 'Eldoret Depot, Highway Junction, Eldoret',
        weather_category_id: weather.weather_category_id,
        effects_severity: 'none',
        other_notes_text: 'Site survey and land documentation review underway.',
        status: 'submitted',
        author_id: USER_IDS.SITE_ENGINEER,
        submitted_by: USER_IDS.SITE_ENGINEER,
        submitted_at: '2026-10-12T17:30:00Z',
        is_late: false,
      },
      {
        dpr_id: '53000000-0000-0000-0000-000000000022',
        dpr_ref: 'DPR-002-001-2026-20261013',
        project_id: PROJECT_3,
        stage_no: 3,
        report_date: '2026-10-13',
        site_location: 'Eldoret Depot, Highway Junction, Eldoret',
        weather_category_id: weather.weather_category_id,
        effects_severity: 'none',
        other_notes_text: 'Geotechnical survey ongoing; no blockers.',
        status: 'submitted',
        author_id: USER_IDS.PM_2,
        submitted_by: USER_IDS.PM_2,
        submitted_at: '2026-10-13T18:45:00Z',
        is_late: false,
      },
    ])
    .onConflict('dpr_id')
    .merge([
      'dpr_ref',
      'project_id',
      'stage_no',
      'report_date',
      'site_location',
      'weather_category_id',
      'effects_severity',
      'other_notes_text',
      'status',
      'author_id',
      'submitted_by',
      'submitted_at',
      'is_late',
      'updated_at',
    ]);
}
