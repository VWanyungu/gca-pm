import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('submission_client_photo', (table) => {
    table
      .uuid('submission_id')
      .notNullable()
      .references('submission_id')
      .inTable('weekly_submission')
      .onDelete('CASCADE');
    table.uuid('photo_id').notNullable().references('photo_id').inTable('dpr_photo');
    table.smallint('sort_order').notNullable();
    table.string('client_caption', 1000);

    table.primary(['submission_id', 'photo_id']);
    table.index(['submission_id', 'sort_order'], 'ix_scp_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('submission_client_photo');
}
