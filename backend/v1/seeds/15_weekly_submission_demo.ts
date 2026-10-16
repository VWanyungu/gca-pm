import type { Knex } from 'knex';

// Demo data for the PM "Submit" screen (S-PM-03) on Project 2, which has no
// weekly_submission yet for the current week — lets "Start submission" create
// a fresh draft, with DPRs and register risks already in place to fill it in.
// 5 open risks (2 High, 3 Medium by score) to populate the "Add from risk
// register" multi-select list.
const USER_IDS = {
  PM: '10000000-0000-0000-0000-000000000004',
  SITE_ENGINEER_2: '10000000-0000-0000-0000-000000000008',
};

const PROJECT_ID = '20000000-0000-0000-0000-000000000002';
const STAGE_NO = 4;

export async function seed(knex: Knex): Promise<void> {
  const weather = await knex('weather_category')
    .select('weather_category_id')
    .where({ name: 'Clear' })
    .first<{ weather_category_id: number }>();
  const categories = await knex('risk_category')
    .select('risk_category_id', 'code')
    .whereIn('code', ['permits_regulatory', 'materials_supply', 'schedule_slippage', 'safety']);
  const categoryId = (code: string) => {
    const row = categories.find((c) => c.code === code);
    if (!row) throw new Error(`Seeded ${code} risk category was not found`);
    return row.risk_category_id as number;
  };

  if (!weather) throw new Error('Seeded Clear weather category was not found');

  await knex('dpr')
    .insert([
      {
        dpr_id: '53000000-0000-0000-0000-000000000010',
        dpr_ref: 'DPR-001-002-2026-20261012',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        report_date: '2026-10-12',
        site_location: 'Enterprise Road, Industrial Area, Nairobi',
        weather_category_id: weather.weather_category_id,
        effects_severity: 'none',
        other_notes_text: 'Trenching progressed on schedule.',
        status: 'submitted',
        author_id: USER_IDS.SITE_ENGINEER_2,
        submitted_by: USER_IDS.SITE_ENGINEER_2,
        submitted_at: '2026-10-12T18:42:00Z',
        is_late: false,
      },
      {
        dpr_id: '53000000-0000-0000-0000-000000000011',
        dpr_ref: 'DPR-001-002-2026-20261013',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        report_date: '2026-10-13',
        site_location: 'Enterprise Road, Industrial Area, Nairobi',
        weather_category_id: weather.weather_category_id,
        effects_severity: 'minor',
        other_notes_text: 'Short delay waiting on county way-leave sign-off.',
        status: 'submitted',
        author_id: USER_IDS.SITE_ENGINEER_2,
        submitted_by: USER_IDS.SITE_ENGINEER_2,
        submitted_at: '2026-10-13T21:10:00Z',
        is_late: true,
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

  await knex('risk')
    .insert([
      {
        risk_id: '56000000-0000-0000-0000-000000000010',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        title: 'Way-leave approval, Block D',
        description: 'Outstanding way-leave approval could delay the Block D corridor.',
        category_id: categoryId('permits_regulatory'),
        likelihood: 3,
        impact: 3,
        owner_id: USER_IDS.PM,
        mitigation: 'Follow up with the county roads office.',
        status: 'open',
        source: 'manual',
        kind: 'risk',
        opened_at: '2026-10-12T09:00:00Z',
        created_by: USER_IDS.PM,
      },
      {
        risk_id: '56000000-0000-0000-0000-000000000011',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        title: 'Meter supplier lead time',
        description: 'Pipe delivery for the next trenching section is unconfirmed.',
        category_id: categoryId('materials_supply'),
        likelihood: 2,
        impact: 4,
        owner_id: USER_IDS.SITE_ENGINEER_2,
        mitigation: 'Confirm dispatch date with supplier this week.',
        status: 'open',
        source: 'manual',
        kind: 'risk',
        opened_at: '2026-10-13T09:00:00Z',
        created_by: USER_IDS.PM,
      },
      {
        risk_id: '56000000-0000-0000-0000-000000000012',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        title: 'Trench excavation overdue, Zone B',
        description: 'Zone B trenching is behind the planned schedule.',
        category_id: categoryId('schedule_slippage'),
        likelihood: 5,
        impact: 3,
        owner_id: USER_IDS.PM,
        mitigation: 'Add a second crew to Zone B this week.',
        status: 'open',
        source: 'manual',
        kind: 'risk',
        opened_at: '2026-10-12T09:00:00Z',
        created_by: USER_IDS.PM,
      },
      {
        risk_id: '56000000-0000-0000-0000-000000000013',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        title: 'Zone C pipe delivery late',
        description: 'Supplier has not confirmed dispatch for the Zone C trenching pipe.',
        category_id: categoryId('materials_supply'),
        likelihood: 4,
        impact: 4,
        owner_id: USER_IDS.SITE_ENGINEER_2,
        mitigation: 'Expedite with supplier; air freight as fallback.',
        status: 'open',
        source: 'manual',
        kind: 'risk',
        opened_at: '2026-10-13T09:00:00Z',
        created_by: USER_IDS.PM,
      },
      {
        risk_id: '56000000-0000-0000-0000-000000000014',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO,
        title: 'Traffic management plan, Block D',
        description: 'Traffic management plan for Block D works needs sign-off.',
        category_id: categoryId('safety'),
        likelihood: 3,
        impact: 3,
        owner_id: USER_IDS.PM,
        mitigation: 'Submit the traffic plan for county review.',
        status: 'open',
        source: 'manual',
        kind: 'risk',
        opened_at: '2026-10-13T09:00:00Z',
        created_by: USER_IDS.PM,
      },
    ])
    .onConflict('risk_id')
    .merge([
      'project_id',
      'stage_no',
      'title',
      'description',
      'category_id',
      'likelihood',
      'impact',
      'owner_id',
      'mitigation',
      'status',
      'source',
      'kind',
      'opened_at',
      'created_by',
      'updated_at',
    ]);
}
