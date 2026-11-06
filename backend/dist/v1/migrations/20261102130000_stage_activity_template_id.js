export async function up(knex) {
    await knex.schema.alterTable('stage_activity', (table) => {
        table.uuid('template_id').references('template_id').inTable('pdm_gate_activity_template');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('stage_activity', (table) => {
        table.dropColumn('template_id');
    });
}
