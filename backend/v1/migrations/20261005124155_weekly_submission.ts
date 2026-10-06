import type { Knex } from 'knex';

const SUBMISSION_STATUS = ['draft', 'approved', 'superseded'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('weekly_submission', (table) => {
    table.uuid('submission_id').primary();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.date('week_start').notNullable();
    table.smallint('revision_no').notNullable().defaultTo(1);

    table
      .uuid('supersedes_submission_id')
      .references('submission_id')
      .inTable('weekly_submission');
    table.string('supersede_reason', 10000);
    table.uuid('supersede_authorised_by').references('id').inTable('users');
    table.timestamp('supersede_authorised_at', { useTz: true });

    table
      .enu('status', [...SUBMISSION_STATUS], {
        useNative: true,
        enumName: 'weekly_submission_status',
      })
      .notNullable();

    table
      .uuid('schedule_version_id')
      .references('schedule_version_id')
      .inTable('schedule_version');
    table.decimal('planned_pct', 5, 2);
    table.decimal('actual_pct', 5, 2);
    table.decimal('spi', 6, 2);
    table.enu('rag', [], { useNative: true, existingType: true, enumName: 'project_rag' });

    table.specificType('active_stages', 'smallint[]').notNullable();
    table.string('scope_change_text', 2000).notNullable().defaultTo('No scope change');

    // FK added in 20261005124195 (risk) once that table exists.
    table.uuid('top_risk_id');
    table.string('top_risk_text', 1000);
    table.string('top_action', 2000);
    table.string('pm_commentary', 10000);
    table.string('exco_decision_needed', 2000);

    table.boolean('escalate').notNullable().defaultTo(false);
    table.string('escalation_reason', 10000);
    table.boolean('is_late');

    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('approved_by').references('id').inTable('users');
    table.timestamp('approved_at', { useTz: true });

    table.unique(['project_id', 'week_start', 'revision_no']);

    table.check(
      'EXTRACT(ISODOW FROM week_start) = 1',
      [],
      'ck_ws_week_start_is_monday',
    );
    table.check(
      '(approved_at IS NULL) = (approved_by IS NULL)',
      [],
      'ck_ws_approved_pair',
    );
    table.check(
      '(supersede_authorised_at IS NULL) = (supersede_authorised_by IS NULL)',
      [],
      'ck_ws_supersede_authorised_pair',
    );
    table.check(
      'NOT escalate OR escalation_reason IS NOT NULL',
      [],
      'ck_ws_escalation_reason_required',
    );
    table.check(
      "status <> 'approved' OR (top_risk_text IS NOT NULL AND top_action IS NOT NULL AND pm_commentary IS NOT NULL AND approved_at IS NOT NULL AND planned_pct IS NOT NULL AND actual_pct IS NOT NULL)",
      [],
      'ck_ws_required_on_approval',
    );
    // Draft rows cannot carry planned/actual — those are copied from the schedule only at approval.
    table.check(
      "status <> 'draft' OR (planned_pct IS NULL AND actual_pct IS NULL AND spi IS NULL AND rag IS NULL AND schedule_version_id IS NULL)",
      [],
      'ck_ws_schedule_values_only_on_approval',
    );

    table.index(['project_id', 'week_start'], 'ix_ws_project_week');
    table.index(['status'], 'ix_ws_draft', { predicate: knex.where('status', 'draft') });
  });

  await knex.raw(`
    DROP TRIGGER IF EXISTS weekly_submission_set_updated_at ON weekly_submission;
    CREATE TRIGGER weekly_submission_set_updated_at
      BEFORE UPDATE ON weekly_submission
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TRIGGER IF EXISTS weekly_submission_set_updated_at ON weekly_submission`);
  await knex.schema.dropTableIfExists('weekly_submission');
  await knex.raw(`DROP TYPE IF EXISTS weekly_submission_status`);
}
