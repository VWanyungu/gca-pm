/**
 * AC-SCH-02: a rebaseline no longer needs a change request at all (UI dropped the CR
 * gate for a plain confirm). `ck_sv_rebaseline_cr` used to require the two in lockstep;
 * now a CR id is only constrained to upload_kind = 'rebaseline' when one is supplied.
 */
export async function up(knex) {
    await knex.raw('ALTER TABLE schedule_version DROP CONSTRAINT ck_sv_rebaseline_cr');
    await knex.raw(`
    ALTER TABLE schedule_version
      ADD CONSTRAINT ck_sv_rebaseline_cr
      CHECK (change_request_id IS NULL OR upload_kind = 'rebaseline')
  `);
}
export async function down(knex) {
    await knex.raw('ALTER TABLE schedule_version DROP CONSTRAINT ck_sv_rebaseline_cr');
    await knex.raw(`
    ALTER TABLE schedule_version
      ADD CONSTRAINT ck_sv_rebaseline_cr
      CHECK ((upload_kind = 'rebaseline') = (change_request_id IS NOT NULL))
  `);
}
