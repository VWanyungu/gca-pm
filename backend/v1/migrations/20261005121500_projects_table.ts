import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('projects'))) {
    await knex.schema.createTable('projects', (table) => {
      table.uuid('project_id').primary();
      table.string('project_code').notNullable().unique();
      table.string('name').notNullable();
      table
        .smallint('program_id')
        .notNullable()
        .references('program_id')
        .inTable('programs')
        .index();

      table.string('client_name', 500);
      table.string('country');
      table.string('site_location', 500);
      table.decimal('site_lat', 9, 6).nullable();
      table.decimal('site_lng', 9, 6).nullable();
      table.string('timezone').notNullable();

      table.boolean('is_civil').notNullable().defaultTo(false);
      table.boolean('is_mechanical').notNullable().defaultTo(false);
      table.boolean('is_electrical').notNullable().defaultTo(false);

      table.date('expected_start_date');
      table.date('expected_end_date');

      table.decimal('estimated_value', 14, 2);
      table.specificType('currency', 'char(3)');

      table
        .enum('status', ['active', 'on_hold', 'complete', 'cancelled'])
        .notNullable()
        .defaultTo('active');

      table.string('legacy_source_ref').nullable();

      // FK added in 20261005124255 (holiday_calendar) once that table exists.
      table.smallint('holiday_calendar_id');
      table
        .specificType('dpr_expected_weekdays', 'smallint[]')
        .notNullable()
        .defaultTo(knex.raw(`'{1,2,3,4,5,6}'::smallint[]`));

      table.uuid('created_by').notNullable().references('id').inTable('users');
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });

    // BR-15: project_code must match NNN-NNN.YYYY
    await knex.raw(
      `ALTER TABLE projects ADD CONSTRAINT projects_project_code_format CHECK (project_code ~ '^[0-9]{3}-[0-9]{3}\\.[0-9]{4}$')`,
    );
  }

  await knex.schema.alterTable('roles', (table) => {
    table.foreign('project_id').references('project_id').inTable('projects');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('roles', (table) => {
    table.dropForeign('project_id');
  });
  await knex.schema.dropTableIfExists('projects');
}
