import type { Knex } from 'knex';

const RAG = ['green', 'amber', 'red'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_metrics_snapshot', (table) => {
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.date('as_of_date').notNullable();
    table
      .uuid('schedule_version_id')
      .notNullable()
      .references('schedule_version_id')
      .inTable('schedule_version');

    table.decimal('planned_pct', 5, 2).notNullable();
    table.decimal('actual_pct', 5, 2).notNullable();
    table.decimal('spi', 6, 2);
    table.enu('rag', [...RAG], { useNative: true, enumName: 'project_rag' });
    table.date('baseline_finish');
    table.date('forecast_finish');
    table.timestamp('computed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['project_id', 'as_of_date']);
    table.check('(spi IS NULL) = (rag IS NULL)', [], 'ck_pms_spi_rag_pair');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_metrics_snapshot');
  await knex.raw(`DROP TYPE IF EXISTS project_rag`);
}
