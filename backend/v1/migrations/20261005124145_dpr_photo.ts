import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_photo', (table) => {
    table.uuid('photo_id').primary();
    table
      .uuid('dpr_id')
      .notNullable()
      .references('dpr_id')
      .inTable('dpr')
      .onDelete('CASCADE');
    // FK added in 20261005124235 (file_object) once that table exists.
    table.uuid('file_id').notNullable().unique();
    table.string('caption', 1000);
    table.smallint('sort_order').notNullable();
    table.timestamp('taken_at', { useTz: true });
    table.decimal('gps_lat', 9, 6);
    table.decimal('gps_lng', 9, 6);
    table.uuid('uploaded_by').notNullable().references('id').inTable('users');
    table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['dpr_id', 'sort_order'], 'ix_dpr_photo_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_photo');
}
