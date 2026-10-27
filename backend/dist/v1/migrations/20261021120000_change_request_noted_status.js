/**
 * A Site Engineer's change request is FYI only — a record for the PM, not a request for ExCo
 * approval (AC-CHG-01) — so it needs a terminal status distinct from 'approved': an approved
 * CR unlocks a rebaseline upload (AC-CHG-05/AC-SCH-02), which an unreviewed FYI note must not.
 */
export async function up(knex) {
    await knex.raw(`ALTER TYPE change_request_status ADD VALUE 'noted'`);
}
export async function down(knex) {
    await knex.raw('ALTER TYPE change_request_status RENAME TO change_request_status_old');
    await knex.raw(`CREATE TYPE change_request_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn')`);
    await knex.raw(`
    ALTER TABLE change_request
      ALTER COLUMN status TYPE change_request_status
      USING (
        CASE WHEN status::text = 'noted' THEN 'pending' ELSE status::text END
      )::change_request_status
  `);
    await knex.raw('DROP TYPE change_request_status_old');
}
