import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('custom_milestones', (table) => {
    table.uuid('milestone_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.smallint('stage_no');

    table.text('title').notNullable();
    table.date('planned_date').notNullable();
    table.date('forecast_date');
    table.date('actual_date');
    table.text('notes');

    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('updated_by').notNullable().references('id').inTable('users');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('removed_by').references('id').inTable('users');
    table.timestamp('removed_at', { useTz: true });

    // Composite FK: enforced only when stage_no is non-null (PG MATCH SIMPLE default)
    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');

    table.check(
      '(removed_at IS NULL) = (removed_by IS NULL)',
      [],
      'ck_custom_milestones_removed_pair',
    );

    table.index(['project_id', 'stage_no'], 'ix_custom_milestones_project_stage');
  });

  await knex.raw(`
    DROP TRIGGER IF EXISTS custom_milestones_set_updated_at ON custom_milestones;
    CREATE TRIGGER custom_milestones_set_updated_at
      BEFORE UPDATE ON custom_milestones
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TRIGGER IF EXISTS custom_milestones_set_updated_at ON custom_milestones`);
  await knex.schema.dropTableIfExists('custom_milestones');
}
