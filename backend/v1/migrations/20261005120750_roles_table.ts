import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('roles')) return;

  await knex.schema.createTable('roles', (table) => {
    table.uuid('attribute_id').primary();

    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').index();

    table.enum('role', ['PM', 'Planner', 'SiteEngineer', 'ExCo', 'Admin', 'ProjectCreator']).notNullable();
    table.enum('scope_type', ['global', 'program', 'project']).notNullable();

    table.smallint('program_id').nullable().index();
    // ponytail: no FK on project_id yet — projects table doesn't exist. Add FK when that migration lands.
    table.uuid('project_id').nullable().index();

    table.uuid('granted_by').notNullable().references('id').inTable('users');
    table.timestamp('granted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.uuid('revoked_by').nullable().references('id').inTable('users');
    table.timestamp('revoked_at', { useTz: true }).nullable();
    table.text('revoke_reason').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('roles');
}
