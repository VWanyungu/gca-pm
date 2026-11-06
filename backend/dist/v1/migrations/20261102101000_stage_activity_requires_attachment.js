export async function up(knex) {
    await knex.schema.alterTable('stage_activity', (table) => {
        table.boolean('requires_attachment').notNullable().defaultTo(false);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('stage_activity', (table) => {
        table.dropColumn('requires_attachment');
    });
}
