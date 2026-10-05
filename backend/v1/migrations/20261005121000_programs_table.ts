import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('programs'))) {
    await knex.schema.createTable('programs', (table) => {
      table.smallint('program_id').primary();
      table.text('name').notNullable().unique();
      table.boolean('is_active').notNullable().defaultTo(true);
    });
  }

  await knex.schema.alterTable('roles', (table) => {
    table.foreign('program_id').references('program_id').inTable('programs');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('roles', (table) => {
    table.dropForeign('program_id');
  });
  await knex.schema.dropTableIfExists('programs');
}
