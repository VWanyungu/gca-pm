import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('project_team_members')) return;

  await knex.schema.createTable('project_team_members', (table) => {
    table
      .uuid('project_id')
      .notNullable()
      .references('project_id')
      .inTable('projects')
      .onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.boolean('is_team_lead').notNullable().defaultTo(false);
    table.timestamp('added_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['project_id', 'user_id']);
  });

  await knex.raw(`
    CREATE UNIQUE INDEX project_team_members_one_lead_per_project
    ON project_team_members (project_id)
    WHERE is_team_lead
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_team_members');
}
