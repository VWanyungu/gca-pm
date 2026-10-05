import type { Knex } from 'knex';

const STAGE_STATES = ['not_started', 'active', 'inactive', 'complete'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_stage', (table) => {
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.smallint('stage_no').notNullable().references('stage_no').inTable('pdm_stage');
    table.boolean('in_scope').notNullable().defaultTo(true);
    table
      .enu('state', [...STAGE_STATES], { useNative: true, enumName: 'stage_state' })
      .notNullable()
      .defaultTo('not_started');
    table.uuid('added_to_scope_by').notNullable().references('id').inTable('users');
    table.timestamp('added_to_scope_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('last_changed_by').notNullable().references('id').inTable('users');
    table.timestamp('last_changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['project_id', 'stage_no']);
    table.check("in_scope OR state <> 'active'", [], 'ck_project_stage_active_in_scope');
    table.index(['project_id'], 'ix_project_stage_active', {
      predicate: knex.where('state', 'active'),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_stage');
  await knex.raw(`DROP TYPE IF EXISTS stage_state`);
}
