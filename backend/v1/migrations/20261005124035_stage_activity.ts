import type { Knex } from 'knex';

const ACTIVITY_STATUSES = ['open', 'in_progress', 'done', 'cancelled'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stage_activity', (table) => {
    table.uuid('activity_id').primary();
    table.uuid('project_id').notNullable();
    table.smallint('stage_no').notNullable();
    table.string('title', 500).notNullable();
    table.string('description', 10000);
    table
      .enu('status', [...ACTIVITY_STATUSES], { useNative: true, enumName: 'activity_status' })
      .notNullable()
      .defaultTo('open');
    table.date('due_date');
    table.uuid('owner_id').references('id').inTable('users');
    table.timestamp('completed_at', { useTz: true });
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');
    table.check(
      "(status = 'done') = (completed_at IS NOT NULL)",
      [],
      'ck_activity_completed_at',
    );
    table.index(['project_id', 'stage_no', 'status'], 'ix_activity_project_stage');
    table.index(['owner_id'], 'ix_activity_owner_open', {
      predicate: knex.whereIn('status', ['open', 'in_progress']),
    });
  });

  // ponytail: triggers have no knex builder — raw stays until knex grows a trigger API.
  // Shared set_updated_at() comes from 20261005122000.
  await knex.raw(`
    DROP TRIGGER IF EXISTS stage_activity_set_updated_at ON stage_activity;
    CREATE TRIGGER stage_activity_set_updated_at
      BEFORE UPDATE ON stage_activity
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TRIGGER IF EXISTS stage_activity_set_updated_at ON stage_activity`);
  await knex.schema.dropTableIfExists('stage_activity');
  await knex.raw(`DROP TYPE IF EXISTS activity_status`);
}
