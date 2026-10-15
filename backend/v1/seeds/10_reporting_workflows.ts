import type { Knex } from 'knex';

const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
};

const PROJECT_ID = '20000000-0000-0000-0000-000000000001';
const SCHEDULE_VERSION_ID = '52000000-0000-0000-0000-000000000001';
const DPR_ID = '53000000-0000-0000-0000-000000000001';
const PROJECT_CONTRACTOR_ID = '53000000-0000-0000-0000-000000000002';
const PERSONNEL_GROUP_ID = '53000000-0000-0000-0000-000000000003';
const RISK_ID = '54000000-0000-0000-0000-000000000001';
const CHANGE_ID = '54000000-0000-0000-0000-000000000002';
const SUBMISSION_ID = '54000000-0000-0000-0000-000000000003';
const PHOTO_ID = '53000000-0000-0000-0000-000000000004';
const CLIENT_REPORT_FILE_ID = '56000000-0000-0000-0000-000000000004';

export async function seed(knex: Knex): Promise<void> {
  const weather = await knex('weather_category')
    .select('weather_category_id')
    .where({ name: 'Clear' })
    .first<{ weather_category_id: number }>();
  const riskCategory = await knex('risk_category')
    .select('risk_category_id')
    .where({ code: 'safety' })
    .first<{ risk_category_id: number }>();
  const personnelRoles = await knex('personnel_role')
    .select('personnel_role_id', 'name')
    .whereIn('name', ['Project Manager', 'Engineer', 'Technician']);

  if (!weather) throw new Error('Seeded Clear weather category was not found');
  if (!riskCategory) throw new Error('Seeded safety risk category was not found');
  if (personnelRoles.length !== 3) throw new Error('Seeded personnel roles were not found');

  const personnelRoleIds = new Map(
    personnelRoles.map((role) => [role.name as string, role.personnel_role_id as number]),
  );

  await knex('contractor')
    .insert({
      contractor_id: '53000000-0000-0000-0000-000000000005',
      name: 'Coastal Civil Works Ltd',
      registration_no: 'CPR-KE-2026-001',
      is_active: true,
      created_by: USER_IDS.ADMIN,
    })
    .onConflict('contractor_id')
    .merge(['name', 'registration_no', 'is_active', 'created_by']);

  await knex('project_contractor')
    .insert({
      project_contractor_id: PROJECT_CONTRACTOR_ID,
      project_id: PROJECT_ID,
      contractor_id: '53000000-0000-0000-0000-000000000005',
      party_type: 'contractor',
      is_active: true,
      added_by: USER_IDS.PM,
    })
    .onConflict('project_contractor_id')
    .merge(['project_id', 'contractor_id', 'party_type', 'is_active', 'added_by']);

  await knex('dpr')
    .insert({
      dpr_id: DPR_ID,
      dpr_ref: 'DPR-001-001-2026-20261012',
      project_id: PROJECT_ID,
      stage_no: 7,
      report_date: '2026-10-12',
      site_location: 'Kipevu Oil Terminal, Mombasa',
      contract_no: 'KPC-LPG-2026-01',
      weather_category_id: weather.weather_category_id,
      temp_min_c: 23,
      temp_max_c: 30,
      humidity_pct: 68,
      wind: 'Light easterly winds',
      effects_severity: 'none',
      equipment_text: 'Excavator and compactor operational.',
      visitors_text: 'Client engineering team completed a site walk.',
      delays_text: 'No delays reported.',
      incidents_text: 'No incidents reported.',
      other_notes_text: 'Foundation reinforcement inspection is scheduled.',
      status: 'submitted',
      author_id: USER_IDS.SITE_ENGINEER,
      submitted_by: USER_IDS.SITE_ENGINEER,
      submitted_at: '2026-10-12T17:00:00Z',
      is_late: false,
    })
    .onConflict('dpr_id')
    .merge([
      'dpr_ref',
      'project_id',
      'stage_no',
      'report_date',
      'site_location',
      'contract_no',
      'weather_category_id',
      'temp_min_c',
      'temp_max_c',
      'humidity_pct',
      'wind',
      'effects_severity',
      'equipment_text',
      'visitors_text',
      'delays_text',
      'incidents_text',
      'other_notes_text',
      'status',
      'author_id',
      'submitted_by',
      'submitted_at',
      'is_late',
      'updated_at',
    ]);

  await knex('dpr_work_item')
    .insert({
      work_item_id: '53000000-0000-0000-0000-000000000006',
      dpr_id: DPR_ID,
      sort_order: 1,
      work_area: 'Tank farm',
      work_carried_out: 'Completed formwork and placed reinforcement for the storage tank foundation.',
    })
    .onConflict('work_item_id')
    .merge(['dpr_id', 'sort_order', 'work_area', 'work_carried_out']);

  const progressId = '53000000-0000-0000-0000-000000000007';
  await knex('dpr_activity_progress')
    .insert({
      dpr_activity_progress_id: progressId,
      dpr_id: DPR_ID,
      sort_order: 1,
      source: 'free_text',
      free_text: 'Tank foundation reinforcement and formwork',
      today_pct: 15,
      total_pct: 35,
    })
    .onConflict('dpr_activity_progress_id')
    .merge(['dpr_id', 'sort_order', 'source', 'task_id', 'free_text', 'today_pct', 'total_pct']);

  await knex('dpr_personnel_group')
    .insert({
      personnel_group_id: PERSONNEL_GROUP_ID,
      dpr_id: DPR_ID,
      project_contractor_id: PROJECT_CONTRACTOR_ID,
      sort_order: 1,
      total_headcount: 14,
    })
    .onConflict('personnel_group_id')
    .merge(['dpr_id', 'project_contractor_id', 'sort_order', 'total_headcount']);

  const roleCounts = [
    { name: 'Project Manager', headcount: 1 },
    { name: 'Engineer', headcount: 3 },
    { name: 'Technician', headcount: 10 },
  ].map((row) => {
    const personnelRoleId = personnelRoleIds.get(row.name);
    if (personnelRoleId === undefined) throw new Error(`Seeded personnel role ${row.name} was not found`);
    return {
      personnel_group_id: PERSONNEL_GROUP_ID,
      personnel_role_id: personnelRoleId,
      headcount: row.headcount,
    };
  });

  await knex('dpr_personnel_role_count')
    .insert(roleCounts)
    .onConflict(['personnel_group_id', 'personnel_role_id'])
    .merge(['headcount']);

  await knex('dpr_photo')
    .insert({
      photo_id: PHOTO_ID,
      dpr_id: DPR_ID,
      file_id: '56000000-0000-0000-0000-000000000003',
      caption: 'Tank foundation reinforcement in progress.',
      sort_order: 1,
      taken_at: '2026-10-12T14:30:00Z',
      gps_lat: -4.043477,
      gps_lng: 39.668206,
      uploaded_by: USER_IDS.SITE_ENGINEER,
    })
    .onConflict('photo_id')
    .merge([
      'dpr_id',
      'file_id',
      'caption',
      'sort_order',
      'taken_at',
      'gps_lat',
      'gps_lng',
      'uploaded_by',
    ]);

  await knex('dpr_amendment')
    .insert({
      amendment_id: '53000000-0000-0000-0000-000000000008',
      dpr_id: DPR_ID,
      amendment_no: 1,
      reason: 'Correct the activity narrative after the daily review.',
      proposed_document: {
        work_items: [{ work_area: 'Tank farm', work_carried_out: 'Reinforcement and formwork completed.' }],
      },
      status: 'pending',
      requested_by: USER_IDS.SITE_ENGINEER,
    })
    .onConflict('amendment_id')
    .merge(['dpr_id', 'amendment_no', 'reason', 'proposed_document', 'status', 'requested_by']);

  await knex('risk')
    .insert({
      risk_id: RISK_ID,
      project_id: PROJECT_ID,
      stage_no: 7,
      title: 'Late delivery of LPG tank valves',
      description: 'Valve delivery timing could delay final tank installation.',
      category_id: riskCategory.risk_category_id,
      likelihood: 3,
      impact: 4,
      owner_id: USER_IDS.PM,
      mitigation: 'Confirm delivery dates weekly and identify an approved alternate supplier.',
      status: 'open',
      source: 'manual',
      kind: 'risk',
      opened_at: '2026-10-12T09:00:00Z',
      created_by: USER_IDS.PM,
    })
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
      'source_task_id',
      'source_schedule_version_id',
      'kind',
      'opened_at',
      'closed_at',
      'created_by',
      'updated_at',
    ]);

  await knex('change_request')
    .insert({
      change_id: CHANGE_ID,
      project_id: PROJECT_ID,
      change_no: 1,
      stage_no: 7,
      type: 'scope',
      title: 'Add secondary tank access platform',
      scope_description: 'Add a fixed access platform to improve inspection access.',
      reason: 'The revised safety review recommends safer access for routine inspection.',
      supporting_notes: 'Detail design is available for review.',
      cost_impact: 12000,
      cost_currency: 'USD',
      schedule_impact_days: 3,
      status: 'approved',
      raised_by: USER_IDS.PM,
      raised_at: '2026-10-10T10:00:00Z',
      decided_at: '2026-10-11T12:00:00Z',
    })
    .onConflict('change_id')
    .merge([
      'project_id',
      'change_no',
      'stage_no',
      'type',
      'title',
      'scope_description',
      'reason',
      'supporting_notes',
      'cost_impact',
      'cost_currency',
      'schedule_impact_days',
      'status',
      'raised_by',
      'raised_at',
      'decided_at',
      'withdrawn_at',
    ]);

  await knex('change_approval')
    .insert([
      {
        approval_id: '54000000-0000-0000-0000-000000000004',
        change_id: CHANGE_ID,
        approver_role: 'exco',
        approver_id: USER_IDS.ADMIN,
        decision: 'approve',
        comment: 'Approved for implementation.',
        decided_at: '2026-10-11T11:00:00Z',
      },
      {
        approval_id: '54000000-0000-0000-0000-000000000005',
        change_id: CHANGE_ID,
        approver_role: 'finance',
        approver_id: USER_IDS.PM_2,
        decision: 'approve',
        comment: 'Budget impact approved.',
        decided_at: '2026-10-11T12:00:00Z',
      },
    ])
    .onConflict('approval_id')
    .merge(['change_id', 'approver_role', 'approver_id', 'decision', 'comment', 'decided_at']);

  await knex('weekly_submission')
    .insert({
      submission_id: SUBMISSION_ID,
      project_id: PROJECT_ID,
      week_start: '2026-10-12',
      revision_no: 1,
      status: 'approved',
      schedule_version_id: SCHEDULE_VERSION_ID,
      planned_pct: 100,
      actual_pct: 35,
      spi: 0.35,
      rag: 'red',
      active_stages: [7],
      scope_change_text: 'No scope change.',
      top_risk_id: RISK_ID,
      top_risk_text: 'Late delivery of LPG tank valves.',
      top_action: 'Confirm delivery dates and maintain an alternate supplier.',
      pm_commentary: 'Foundation work is progressing; procurement timing needs close follow-up.',
      exco_decision_needed: 'No decision required this week.',
      escalate: true,
      escalation_reason: 'Executive visibility is requested for the long-lead valve delivery.',
      is_late: false,
      created_by: USER_IDS.PM,
      approved_by: USER_IDS.ADMIN,
      approved_at: '2026-10-13T08:00:00Z',
      updated_at: '2026-10-13T08:00:00Z',
    })
    .onConflict('submission_id')
    .merge([
      'project_id',
      'week_start',
      'revision_no',
      'status',
      'schedule_version_id',
      'planned_pct',
      'actual_pct',
      'spi',
      'rag',
      'active_stages',
      'scope_change_text',
      'top_risk_id',
      'top_risk_text',
      'top_action',
      'pm_commentary',
      'exco_decision_needed',
      'escalate',
      'escalation_reason',
      'is_late',
      'created_by',
      'approved_by',
      'approved_at',
      'updated_at',
    ]);

  await knex('submission_addressed_risk')
    .insert({
      submission_id: SUBMISSION_ID,
      risk_id: RISK_ID,
      project_id: PROJECT_ID,
      method: 'commentary',
      added_by: USER_IDS.PM,
    })
    .onConflict(['submission_id', 'risk_id'])
    .merge(['project_id', 'method', 'added_by']);

  await knex('submission_client_photo')
    .insert({
      submission_id: SUBMISSION_ID,
      photo_id: PHOTO_ID,
      sort_order: 1,
      client_caption: 'Foundation reinforcement progress.',
    })
    .onConflict(['submission_id', 'photo_id'])
    .merge(['sort_order', 'client_caption']);

  const escalationId = '54000000-0000-0000-0000-000000000006';
  await knex('escalation')
    .insert({
      escalation_id: escalationId,
      submission_id: SUBMISSION_ID,
      project_id: PROJECT_ID,
      status: 'open',
    })
    .onConflict('escalation_id')
    .merge(['submission_id', 'project_id', 'status']);

  await knex('escalation_response')
    .insert({
      response_id: '54000000-0000-0000-0000-000000000007',
      escalation_id: escalationId,
      author_id: USER_IDS.ADMIN,
      body: 'The valve delivery risk is noted; provide an update at the next review.',
      is_acknowledgement: true,
      created_at: '2026-10-13T08:30:00Z',
    })
    .onConflict('response_id')
    .merge(['escalation_id', 'author_id', 'body', 'is_acknowledgement', 'created_at']);

  const sendId = '54000000-0000-0000-0000-000000000008';
  await knex('client_report_send')
    .insert({
      send_id: sendId,
      submission_id: SUBMISSION_ID,
      pdf_file_id: CLIENT_REPORT_FILE_ID,
      status: 'sent',
      provider_message_id: 'seed-message-2026-10-12',
      sent_by: USER_IDS.PM,
      requested_at: '2026-10-13T09:00:00Z',
      sent_at: '2026-10-13T09:01:00Z',
    })
    .onConflict('send_id')
    .merge([
      'submission_id',
      'pdf_file_id',
      'status',
      'failure_reason',
      'provider_message_id',
      'sent_by',
      'requested_at',
      'sent_at',
    ]);

  await knex('client_report_recipient')
    .insert({
      send_id: sendId,
      email: 'd.kariuki@kpc.co.ke',
      client_contact_id: '40000000-0000-0000-0000-000000000001',
      recipient_name: 'Eng. David Kariuki',
    })
    .onConflict(['send_id', 'email'])
    .merge(['client_contact_id', 'recipient_name']);
}
