import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.boolean('is_mechanical').notNullable().defaultTo(true).alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('projects', (table) => {
    table.boolean('is_mechanical').notNullable().defaultTo(false).alter();
  });
}
