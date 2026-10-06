import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('contractor', (table) => {
    table.uuid('contractor_id').primary();
    table.string('name').notNullable();
    table
      .specificType(
        'name_normalized',
        "text GENERATED ALWAYS AS (lower(regexp_replace(trim(name), '\\s+', ' ', 'g'))) STORED",
      )
      .notNullable()
      .unique();
    table.string('registration_no');
    table.uuid('merged_into_id').references('contractor_id').inTable('contractor');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('contractor');
}
