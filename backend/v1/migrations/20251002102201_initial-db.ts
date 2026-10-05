import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary();
      table.string('external_id').unique();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').unique().notNullable().index();
      table.string('password_hash').notNullable();
      table.string('salt');
      table.string('phone_number').unique();
      table.enum('status', ['active', 'deactivated']).defaultTo('active');
      table.string('username').index();
      table.string('is_verified').notNullable().defaultTo('false');
      table.timestamp('last_login');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  if (!(await knex.schema.hasTable('sessions'))) {
    await knex.schema.createTable('sessions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('user_email').notNullable();
      table.string('session_id').notNullable();
      table.string('refresh_token').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('expires_at').notNullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('users');
}
