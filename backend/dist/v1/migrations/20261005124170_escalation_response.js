export async function up(knex) {
    await knex.schema.createTable('escalation_response', (table) => {
        table.uuid('response_id').primary();
        table
            .uuid('escalation_id')
            .notNullable()
            .references('escalation_id')
            .inTable('escalation');
        table.uuid('author_id').notNullable().references('id').inTable('users');
        table.string('body', 10000).notNullable();
        table.boolean('is_acknowledgement').notNullable().defaultTo(false);
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.index(['escalation_id', 'created_at'], 'ix_esc_resp_thread');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('escalation_response');
}
