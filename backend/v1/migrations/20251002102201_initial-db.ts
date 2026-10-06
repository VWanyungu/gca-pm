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
      table.boolean('is_verified').notNullable().defaultTo(false);
      table.timestamp('last_login', { useTz: true });
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
  }

  // Seeded `system` user — AC-GEN-07 actor for jobs & schedule service.
  // Fixed nil UUID so code can reference it as a constant; password_hash is a non-bcrypt
  // sentinel that cannot authenticate.
  await knex('users')
    .insert({
      id: '00000000-0000-0000-0000-000000000000',
      first_name: 'System',
      last_name: 'Actor',
      email: 'system@gca.internal',
      password_hash: '!',
      is_verified: true,
      status: 'active',
    })
    .onConflict('id')
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
