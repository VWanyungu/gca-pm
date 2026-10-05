import type { Knex } from 'knex';

const STAGE_EVENTS = [
  'added_to_scope',
  'removed_from_scope',
  'activated',
  'deactivated',
  'completed',
  'reopened',
] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stage_state_history', (table) => {
    table.uuid('event_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable();
    table.smallint('stage_no').notNullable();
    table
      .enu('event', [...STAGE_EVENTS], { useNative: true, enumName: 'stage_event' })
      .notNullable();
    table.enu('from_state', [], { useNative: true, existingType: true, enumName: 'stage_state' });
    table
      .enu('to_state', [], { useNative: true, existingType: true, enumName: 'stage_state' })
      .notNullable();
    table.text('reason');
    table.jsonb('checklist_snapshot');
    table.text('closure_notes');
    table.uuid('actor_id').notNullable().references('id').inTable('users');
    table.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');
    table.check(
      "(event = 'completed') = (checklist_snapshot IS NOT NULL)",
      [],
      'ck_ssh_snapshot_on_complete',
    );
    table.check("event = 'completed' OR closure_notes IS NULL", [], 'ck_ssh_notes_on_complete');
    table.index(['project_id', 'stage_no', 'occurred_at'], 'ix_ssh_project_stage_time');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stage_state_history');
  await knex.raw(`DROP TYPE IF EXISTS stage_event`);
}
