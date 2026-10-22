import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dpr_activity_progress', (table) => {
    table.timestamp('removed_at', { useTz: true });
  });

  await knex.raw('DROP INDEX IF EXISTS ux_dap_one_task_per_dpr');
  await knex.raw(`
    CREATE UNIQUE INDEX ux_dap_one_task_per_dpr
      ON dpr_activity_progress (dpr_id, task_id)
      WHERE task_id IS NOT NULL AND removed_at IS NULL
  `);

  await knex.raw(`
    CREATE UNIQUE INDEX ux_dpra_one_pending_per_dpr
      ON dpr_amendment (dpr_id)
      WHERE status = 'pending'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS ux_dpra_one_pending_per_dpr');
  await knex.raw('DROP INDEX IF EXISTS ux_dap_one_task_per_dpr');
  await knex.raw(`
    CREATE UNIQUE INDEX ux_dap_one_task_per_dpr
      ON dpr_activity_progress (dpr_id, task_id)
      WHERE task_id IS NOT NULL
  `);
  await knex.schema.alterTable('dpr_activity_progress', (table) => {
    table.dropColumn('removed_at');
  });
}
