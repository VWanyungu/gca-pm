import type { Knex } from 'knex';

const STATUSES = ['active', 'on_hold', 'complete', 'cancelled'] as const;

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('project_status_history')) return;

  await knex.schema.createTable('project_status_history', (table) => {
    table.uuid('history_id').primary();
    table
      .uuid('project_id')
      .notNullable()
      .references('project_id')
      .inTable('projects')
      .onDelete('CASCADE')
      .index();

    table.enum('from_status', [...STATUSES]).notNullable();
    table.enum('to_status', [...STATUSES]).notNullable();
    table.string('reason', 10000);

    table.uuid('actor_id').notNullable().references('id').inTable('users');
    table.timestamp('changed_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  // Reason required when transitioning to on_hold or cancelled
  await knex.raw(`
    ALTER TABLE project_status_history
    ADD CONSTRAINT project_status_history_reason_required
    CHECK (to_status NOT IN ('on_hold','cancelled') OR reason IS NOT NULL)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_status_history');
}
