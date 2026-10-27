export async function up(knex) {
    await knex.schema.createTable('notification_type', (table) => {
        table.string('type_code').primary();
        table.string('description', 10000).notNullable();
        table.boolean('default_in_app').notNullable();
        table.boolean('default_email').notNullable();
        table.boolean('can_opt_out').notNullable();
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('notification_type');
}
