/**
 * Lets an Admin force a user to log in again: access tokens carry their `iat`, so any
 * token issued before this timestamp is rejected by authenticateToken regardless of its
 * own expiry, and the refresh token row is deleted separately so a new access token
 * can't be minted either.
 */
export async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.timestamp('tokens_invalidated_at', { useTz: true });
    });
}
export async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('tokens_invalidated_at');
    });
}
