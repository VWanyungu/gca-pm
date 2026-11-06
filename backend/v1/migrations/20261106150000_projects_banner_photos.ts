import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('projects', 'banner_photos');
  if (!hasCol) {
    await knex.schema.alterTable('projects', (table) => {
      table.jsonb('banner_photos').notNullable().defaultTo('[]');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCol = await knex.schema.hasColumn('projects', 'banner_photos');
  if (hasCol) {
    await knex.schema.alterTable('projects', (table) => {
      table.dropColumn('banner_photos');
    });
  }
}

