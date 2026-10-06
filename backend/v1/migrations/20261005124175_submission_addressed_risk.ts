import type { Knex } from 'knex';

const ADDRESSED_METHODS = ['top_risk', 'top_action', 'commentary', 'dismissed'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('submission_addressed_risk', (table) => {
    table.uuid('submission_id').notNullable();
    table.uuid('risk_id').notNullable();
    table.uuid('project_id').notNullable();
    table
      .enu('method', [...ADDRESSED_METHODS], {
        useNative: true,
        enumName: 'addressed_risk_method',
      })
      .notNullable();
    table.uuid('added_by').notNullable().references('id').inTable('users');
    table.timestamp('added_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['submission_id', 'risk_id']);

    table
      .foreign(['submission_id', 'project_id'])
      .references(['submission_id', 'project_id'])
      .inTable('weekly_submission');

    // Composite FK (risk_id, project_id) → risk added in 20261005124195 (risk).

    table.index(['project_id'], 'ix_sar_project');
    table.index(['risk_id'], 'ix_sar_risk');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('submission_addressed_risk');
  await knex.raw(`DROP TYPE IF EXISTS addressed_risk_method`);
}
