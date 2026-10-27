export async function up(knex) {
    await knex.schema.createTable('change_request_attachment', (table) => {
        table.uuid('attachment_id').primary();
        table
            .uuid('change_id')
            .notNullable()
            .references('change_id')
            .inTable('change_request')
            .onDelete('CASCADE');
        table.uuid('file_id').notNullable().unique().references('file_id').inTable('file_object');
        table.uuid('uploaded_by').notNullable().references('id').inTable('users');
        table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['change_id'], 'ix_cr_attachment_change');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('change_request_attachment');
}
