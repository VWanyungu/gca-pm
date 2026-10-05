import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createView('project_milestone_v', (view) => {
    view.as(
      knex('custom_milestones as cm')
        .whereNull('cm.removed_at')
        .select(
          knex.raw(`'custom'::text as source`),
          'cm.project_id',
          'cm.milestone_id as id',
          'cm.title',
          'cm.planned_date',
          'cm.forecast_date',
          'cm.actual_date',
          knex.raw('(cm.forecast_date - cm.planned_date) as slippage_days'),
          'cm.stage_no',
        )
        .unionAll(
          knex('schedule_task_revision as str')
            .join('schedule_task as st', 'st.task_id', 'str.task_id')
            .join('projects as p', 'p.project_id', 'st.project_id')
            .where('str.is_milestone', true)
            .whereNull('str.valid_to')
            .select(
              knex.raw(`'schedule'::text as source`),
              'st.project_id',
              'str.task_id as id',
              'str.task_name as title',
              knex.raw('(str.baseline_start AT TIME ZONE p.timezone)::date as planned_date'),
              knex.raw('(str.expected_finish AT TIME ZONE p.timezone)::date as forecast_date'),
              knex.raw('(str.actual_finish AT TIME ZONE p.timezone)::date as actual_date'),
              knex.raw(
                '((str.expected_finish AT TIME ZONE p.timezone)::date - (str.baseline_start AT TIME ZONE p.timezone)::date) as slippage_days',
              ),
              knex.raw('NULL::smallint as stage_no'),
            ),
        ),
    );
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropViewIfExists('project_milestone_v');
}
