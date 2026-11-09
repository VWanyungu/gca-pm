import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('client_feedback_request')) return;

  await knex.schema.createTable('client_feedback_request', (table) => {
    table.uuid('request_id').primary();
    table
      .uuid('project_id')
      .notNullable()
      .references('project_id')
      .inTable('projects')
      .onDelete('CASCADE')
      .index();
    table
      .uuid('contact_id')
      .notNullable()
      .references('contact_id')
      .inTable('client_contacts')
      .onDelete('CASCADE')
      .index();
    table.uuid('requested_by').notNullable().references('id').inTable('users');

    // Snapshot of what the request was about at send time (the project's active stage, or
    // "Whole project") — kept even if the project moves on to a later stage afterwards.
    table.string('about', 500).notNullable();

    table.string('token').notNullable().unique();
    table.timestamp('expires_at').notNullable();
    table.timestamp('opened_at');
    table.timestamp('responded_at');

    table.smallint('rating_overall');
    table.smallint('rating_quality');
    table.smallint('rating_updates');
    table.smallint('rating_schedule');
    table.text('comment');

    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table.check('rating_overall between 1 and 5', [], 'ck_cfr_overall_range');
    table.check('rating_quality between 1 and 5', [], 'ck_cfr_quality_range');
    table.check('rating_updates between 1 and 5', [], 'ck_cfr_updates_range');
    table.check('rating_schedule between 1 and 5', [], 'ck_cfr_schedule_range');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client_feedback_request');
}
