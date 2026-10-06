import type { Knex } from 'knex';

const RISK_STATUS = ['open', 'mitigated', 'closed', 'dismissed', 'auto_resolved'] as const;
const AUTO_RES_REASON = ['task_completed', 'rescheduled', 'task_removed'] as const;
const RISK_SOURCE = ['manual', 'auto_overdue_task'] as const;
const RISK_KIND = ['risk', 'issue'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('risk', (table) => {
    table.uuid('risk_id').primary();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.smallint('stage_no');
    table.string('title', 500).notNullable();
    table.string('description', 10000);
    // FK added in 20261005124250 (risk_category) once that table exists.
    table.smallint('category_id').notNullable();

    table.smallint('likelihood');
    table.smallint('impact').notNullable();
    table
      .specificType(
        'score',
        'smallint GENERATED ALWAYS AS (COALESCE(likelihood, 5) * impact) STORED',
      )
      .notNullable();

    table.uuid('owner_id').notNullable().references('id').inTable('users');
    table.string('mitigation', 10000);

    table
      .enu('status', [...RISK_STATUS], { useNative: true, enumName: 'risk_status' })
      .notNullable();
    table.timestamp('addressed_at', { useTz: true });
    table
      .uuid('addressed_submission_id')
      .references('submission_id')
      .inTable('weekly_submission');
    table.string('dismissal_reason', 10000);
    table.enu('auto_resolution_reason', [...AUTO_RES_REASON], {
      useNative: true,
      enumName: 'risk_auto_resolution_reason',
    });

    table
      .enu('source', [...RISK_SOURCE], { useNative: true, enumName: 'risk_source' })
      .notNullable();
    table.uuid('source_task_id');
    table
      .uuid('source_schedule_version_id')
      .references('schedule_version_id')
      .inTable('schedule_version');

    table
      .enu('kind', [...RISK_KIND], { useNative: true, enumName: 'risk_kind' })
      .notNullable();
    table.timestamp('realised_at', { useTz: true });
    table.uuid('realised_by').references('id').inTable('users');

    table.timestamp('opened_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('closed_at', { useTz: true });
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');
    table
      .foreign(['source_task_id', 'project_id'])
      .references(['task_id', 'project_id'])
      .inTable('schedule_task');

    table.check('likelihood IS NULL OR likelihood BETWEEN 1 AND 5', [], 'ck_risk_likelihood_range');
    table.check('impact BETWEEN 1 AND 5', [], 'ck_risk_impact_range');
    table.check("(kind = 'risk') = (likelihood IS NOT NULL)", [], 'ck_risk_likelihood_for_risks');
    table.check(
      "status <> 'dismissed' OR dismissal_reason IS NOT NULL",
      [],
      'ck_risk_dismissal_reason_required',
    );
    table.check(
      "status <> 'auto_resolved' OR auto_resolution_reason IS NOT NULL",
      [],
      'ck_risk_auto_resolution_reason_required',
    );
    table.check(
      '(addressed_at IS NULL) = (addressed_submission_id IS NULL)',
      [],
      'ck_risk_addressed_pair',
    );
    table.check(
      "source <> 'auto_overdue_task' OR kind = 'risk'",
      [],
      'ck_risk_auto_is_risk',
    );
    table.check(
      "(source = 'auto_overdue_task') = (source_task_id IS NOT NULL)",
      [],
      'ck_risk_auto_task_id',
    );
    table.check(
      "(source = 'auto_overdue_task') = (source_schedule_version_id IS NOT NULL)",
      [],
      'ck_risk_auto_schedule_version',
    );
    table.check(
      "(status IN ('mitigated','closed','dismissed','auto_resolved')) = (closed_at IS NOT NULL)",
      [],
      'ck_risk_closed_at_for_terminal',
    );
    table.check('(realised_at IS NULL) = (realised_by IS NULL)', [], 'ck_risk_realised_pair');
    table.check(
      "realised_at IS NULL OR kind = 'issue'",
      [],
      'ck_risk_realised_only_for_issues',
    );

    table.index(['project_id', 'status'], 'ix_risk_project_status');
    table.index(['project_id', 'stage_no'], 'ix_risk_project_stage');
    table.index(['owner_id'], 'ix_risk_owner_open', {
      predicate: knex.whereIn('status', ['open', 'mitigated']),
    });
    table.index(['source_task_id'], 'ix_risk_source_task', {
      predicate: knex.whereNotNull('source_task_id'),
    });
  });

  await knex.raw(`
    DROP TRIGGER IF EXISTS risk_set_updated_at ON risk;
    CREATE TRIGGER risk_set_updated_at
      BEFORE UPDATE ON risk
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);

  // Composite unique is the target of submission_addressed_risk's composite FK below.
  await knex.schema.alterTable('risk', (table) => {
    table.unique(['risk_id', 'project_id'], { indexName: 'uq_risk_risk_project' });
  });

  // Wire the FKs that earlier migrations had to defer.
  await knex.schema.alterTable('weekly_submission', (table) => {
    table.foreign('top_risk_id').references('risk_id').inTable('risk');
  });
  await knex.schema.alterTable('submission_addressed_risk', (table) => {
    table.foreign(['risk_id', 'project_id']).references(['risk_id', 'project_id']).inTable('risk');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('submission_addressed_risk', (table) => {
    table.dropForeign(['risk_id', 'project_id']);
  });
  await knex.schema.alterTable('weekly_submission', (table) => {
    table.dropForeign('top_risk_id');
  });
  await knex.raw(`DROP TRIGGER IF EXISTS risk_set_updated_at ON risk`);
  await knex.schema.dropTableIfExists('risk');
  for (const t of [
    'risk_kind',
    'risk_source',
    'risk_auto_resolution_reason',
    'risk_status',
  ]) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
