/**
 * The upload form asks the Planner "what changed this week (optional)" and AC-SCH-42 shows
 * the version list in schedule history, which is where that line belongs. There was nowhere
 * to put it, so the endpoint had been dropping it.
 */
export async function up(knex) {
    await knex.schema.alterTable('schedule_version', (table) => {
        table.string('notes', 2000);
    });
}
export async function down(knex) {
    await knex.schema.alterTable('schedule_version', (table) => {
        table.dropColumn('notes');
    });
}
