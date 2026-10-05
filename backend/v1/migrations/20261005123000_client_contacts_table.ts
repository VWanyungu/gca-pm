import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('client_contacts')) return;

  await knex.schema.createTable('client_contacts', (table) => {
    table.uuid('contact_id').primary();
    table
      .uuid('project_id')
      .notNullable()
      .references('project_id')
      .inTable('projects')
      .onDelete('CASCADE')
      .index();

    table.text('name').notNullable();
    table.text('email').notNullable();
    table.text('title');
    table.boolean('receives_reports').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client_contacts');
}
