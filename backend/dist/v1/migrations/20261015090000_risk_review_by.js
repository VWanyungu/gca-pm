export async function up(knex) {
    await knex.schema.alterTable('risk', (table) => {
        table.date('review_by');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('risk', (table) => {
        table.dropColumn('review_by');
    });
}
