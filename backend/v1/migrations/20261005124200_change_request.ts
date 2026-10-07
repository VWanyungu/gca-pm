import type { Knex } from 'knex';

const CR_STATUS = ['pending', 'approved', 'rejected', 'withdrawn'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('change_request', (table) => {
    table.uuid('change_id').primary();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.integer('change_no').notNullable();
    table.smallint('stage_no');
    table.string('title', 500).notNullable();
    table.string('scope_description', 10000).notNullable();
    table.string('reason', 10000).notNullable();
    table.string('supporting_notes', 10000);
    table.decimal('cost_impact', 14, 2);
    table.specificType('cost_currency', 'char(3)');
    table.integer('schedule_impact_days');
    table
      .enu('status', [...CR_STATUS], { useNative: true, enumName: 'change_request_status' })
      .notNullable();
    table.uuid('raised_by').notNullable().references('id').inTable('users');
    table.timestamp('raised_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('decided_at', { useTz: true });
    table.timestamp('withdrawn_at', { useTz: true });

    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');

    table.unique(['project_id', 'change_no']);

    table.check(
      '(cost_impact IS NULL) = (cost_currency IS NULL)',
      [],
      'ck_cr_cost_currency_pair',
    );
    table.check(
      "(status IN ('approved','rejected')) = (decided_at IS NOT NULL)",
      [],
      'ck_cr_decided_at_when_decided',
    );
    table.check(
      "(status = 'withdrawn') = (withdrawn_at IS NOT NULL)",
      [],
      'ck_cr_withdrawn_at_when_withdrawn',
    );

    table.index(['project_id', 'status'], 'ix_cr_project_status');
    table.index(['status'], 'ix_cr_pending', {
      predicate: knex.queryBuilder().whereRaw('"status" = \'pending\''),
    });
  });

  // Wire the FK that schedule_version had to defer.
  await knex.schema.alterTable('schedule_version', (table) => {
    table.foreign('change_request_id').references('change_id').inTable('change_request');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_version', (table) => {
    table.dropForeign('change_request_id');
  });
  await knex.schema.dropTableIfExists('change_request');
  await knex.raw(`DROP TYPE IF EXISTS change_request_status`);
}
