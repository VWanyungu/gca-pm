export async function up(knex) {
    await knex.schema.alterTable('projects', (table) => {
        table.boolean('is_mechanical').notNullable().defaultTo(true).alter();
    });
}
export async function down(knex) {
    await knex.schema.alterTable('projects', (table) => {
        table.boolean('is_mechanical').notNullable().defaultTo(false).alter();
    });
}
