import type { Knex } from 'knex';

const PROGRESS_SOURCES = ['schedule_task', 'free_text'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_activity_progress', (table) => {
    table.uuid('dpr_activity_progress_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('dpr_id')
      .notNullable()
      .references('dpr_id')
      .inTable('dpr')
      .onDelete('CASCADE');
    table.smallint('sort_order').notNullable();
    table
      .enu('source', [...PROGRESS_SOURCES], {
        useNative: true,
        enumName: 'dpr_progress_source',
      })
      .notNullable();
    table.uuid('task_id').references('task_id').inTable('schedule_task');
    table.text('free_text');
    table.decimal('today_pct', 5, 2).notNullable();
    table.decimal('total_pct', 5, 2).notNullable();

    table.check(
      "(source = 'schedule_task') = (task_id IS NOT NULL)",
      [],
      'ck_dap_task_source',
    );
    table.check(
      "(source = 'free_text') = (free_text IS NOT NULL)",
      [],
      'ck_dap_free_text_source',
    );
    table.check('today_pct BETWEEN 0 AND 100', [], 'ck_dap_today_pct_range');
    table.check('total_pct BETWEEN 0 AND 100', [], 'ck_dap_total_pct_range');
    table.check('today_pct <= total_pct', [], 'ck_dap_today_le_total');

    table.unique(['dpr_id', 'task_id'], {
      indexName: 'ux_dap_one_task_per_dpr',
      predicate: knex.whereNotNull('task_id'),
    });

    table.index(['dpr_id', 'sort_order'], 'ix_dpr_activity_progress_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_activity_progress');
  await knex.raw(`DROP TYPE IF EXISTS dpr_progress_source`);
}
