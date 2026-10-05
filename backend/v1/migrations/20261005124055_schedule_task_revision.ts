import type { Knex } from 'knex';

const REVISION_SOURCES = ['upload', 'dpr_writeback'] as const;
const CHANGE_TYPES = ['added', 'modified', 'restored'] as const;
const TASK_TYPES = ['fixed_units', 'fixed_duration', 'fixed_work'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedule_task_revision', (table) => {
    table.uuid('revision_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('task_id').notNullable().references('task_id').inTable('schedule_task');
    table
      .uuid('schedule_version_id')
      .notNullable()
      .references('schedule_version_id')
      .inTable('schedule_version');

    table
      .enu('source', [...REVISION_SOURCES], { useNative: true, enumName: 'revision_source' })
      .notNullable();

    // ponytail: FK deferred — dpr_activity_progress doesn't exist yet. Add when that migration lands.
    table.uuid('dpr_activity_progress_id');

    table
      .enu('change_type', [...CHANGE_TYPES], { useNative: true, enumName: 'revision_change_type' })
      .notNullable();

    table.timestamp('valid_from', { useTz: true }).notNullable();
    table.timestamp('valid_to', { useTz: true });

    table.uuid('parent_task_id').references('task_id').inTable('schedule_task');
    table.smallint('outline_level').notNullable();
    table.text('wbs');
    table.text('task_name').notNullable();
    table.integer('duration_minutes').notNullable();

    table.timestamp('baseline_start', { useTz: true });
    table.timestamp('baseline_finish', { useTz: true });
    table.timestamp('start', { useTz: true }).notNullable();
    table.timestamp('expected_finish', { useTz: true }).notNullable();
    table.timestamp('actual_start', { useTz: true });
    table.timestamp('actual_finish', { useTz: true });

    table.decimal('pct_work_complete', 5, 2).notNullable();
    table.decimal('planned_pct_complete', 5, 2).notNullable();

    table.boolean('is_milestone').notNullable();
    table.boolean('is_summary').notNullable();
    table.boolean('is_critical').notNullable();

    table
      .enu('task_type', [...TASK_TYPES], { useNative: true, enumName: 'schedule_task_type' })
      .notNullable();

    table.jsonb('predecessors').notNullable().defaultTo(knex.raw(`'[]'::jsonb`));
    table
      .specificType('resource_names', 'text[]')
      .notNullable()
      .defaultTo(knex.raw(`'{}'::text[]`));

    table.check(
      "(source = 'dpr_writeback') = (dpr_activity_progress_id IS NOT NULL)",
      [],
      'ck_str_writeback_source',
    );
    table.check(
      "source = 'upload' OR change_type = 'modified'",
      [],
      'ck_str_writeback_modifies_only',
    );
    table.check(
      'valid_to IS NULL OR valid_to >= valid_from',
      [],
      'ck_str_valid_range',
    );
    table.check(
      'pct_work_complete BETWEEN 0 AND 100',
      [],
      'ck_str_pct_work_complete_range',
    );
    table.check(
      'planned_pct_complete BETWEEN 0 AND 100',
      [],
      'ck_str_planned_pct_complete_range',
    );
    table.check('parent_task_id <> task_id', [], 'ck_str_no_self_parent');

    table.unique(['task_id'], {
      indexName: 'ux_str_current_revision',
      predicate: knex.whereNull('valid_to'),
    });
    table.index(['task_id', 'valid_from'], 'ix_str_task_history');
    table.index(['schedule_version_id'], 'ix_str_upload_per_version', {
      predicate: knex.where('source', 'upload'),
    });
    table.index(['expected_finish'], 'ix_str_overdue_sweep', {
      predicate: knex.whereNull('valid_to').where('pct_work_complete', '<', 100),
    });
    table.index(['dpr_activity_progress_id'], 'ix_str_writebacks_per_dpr_row', {
      predicate: knex.whereNotNull('dpr_activity_progress_id'),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedule_task_revision');
  for (const t of ['schedule_task_type', 'revision_change_type', 'revision_source']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
