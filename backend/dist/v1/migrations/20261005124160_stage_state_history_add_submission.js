export async function up(knex) {
    await knex.schema.alterTable('stage_state_history', (table) => {
        table.uuid('submission_id').references('submission_id').inTable('weekly_submission');
        table.index(['submission_id'], 'ix_ssh_submission', {
            predicate: knex.whereNotNull('submission_id'),
        });
    });
}
export async function down(knex) {
    await knex.schema.alterTable('stage_state_history', (table) => {
        table.dropIndex(['submission_id'], 'ix_ssh_submission');
        table.dropColumn('submission_id');
    });
}
