import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('refreshTokens'))) {
    await knex.schema.createTable('refreshTokens', (table) => {
      table.increments('id').primary();
      table
        .uuid('user_id')
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE');
      table.string('refresh_token').notNullable().unique();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('tokens'))) {
    await knex.schema.createTable('tokens', (table) => {
      table.increments('id').primary();
      table.string('token').notNullable().unique();
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tokens');
  await knex.schema.dropTableIfExists('refreshTokens');
}
