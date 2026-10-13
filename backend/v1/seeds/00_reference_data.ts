import type { Knex } from 'knex';

const phases = [
  { phase_id: 1, code: 'develop', name: 'Develop', sort_order: 1 },
  { phase_id: 2, code: 'deliver', name: 'Deliver', sort_order: 2 },
  { phase_id: 3, code: 'sustain', name: 'Sustain', sort_order: 3 },
];

const stages = [
  { stage_no: 1, phase_id: 1, name: 'Concept Development' },
  { stage_no: 2, phase_id: 1, name: 'Detailed Feasibility' },
  { stage_no: 3, phase_id: 1, name: 'Structuring & Financing' },
  { stage_no: 4, phase_id: 2, name: 'Planning, Monitoring & Controls (PMC)' },
  { stage_no: 5, phase_id: 2, name: 'Design Development' },
  { stage_no: 6, phase_id: 2, name: 'Procurement' },
  { stage_no: 7, phase_id: 2, name: 'Construction & Installation' },
  { stage_no: 8, phase_id: 3, name: 'Commissioning & Handover' },
  { stage_no: 9, phase_id: 3, name: 'Operations & Maintenance' },
  { stage_no: 10, phase_id: 3, name: 'Decommissioning' },
];

const personnelRoles = [
  { name: 'Project Manager', sort_order: 10 },
  { name: 'Engineer', sort_order: 20 },
  { name: 'Technician', sort_order: 30 },
];

const notificationTypes = [
  {
    type_code: 'weekly_submission_approved',
    description: 'A weekly project submission has been approved.',
    default_in_app: true,
    default_email: true,
    can_opt_out: true,
  },
  {
    type_code: 'risk_escalated',
    description: 'A project risk has been escalated for review.',
    default_in_app: true,
    default_email: true,
    can_opt_out: false,
  },
];

export async function seed(knex: Knex): Promise<void> {
  await knex('pdm_phase').insert(phases).onConflict('phase_id').merge();
  await knex('pdm_stage').insert(stages).onConflict('stage_no').merge();

  await knex('personnel_role')
    .insert(personnelRoles.map((role) => ({ ...role, is_active: true })))
    .onConflict('name')
    .merge(['sort_order', 'is_active']);

  await knex('holiday_calendar')
    .insert({
      name: 'Kenya public holidays',
      country_code: 'KE',
      is_active: true,
    })
    .onConflict('name')
    .merge(['country_code', 'is_active']);

  await knex('notification_type')
    .insert(notificationTypes)
    .onConflict('type_code')
    .merge();
}
