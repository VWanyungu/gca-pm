import type { Knex } from 'knex';

/**
 * AC-SCH-01 ("If another upload for the project is queued or parsing, the DB rejects it")
 * and AC-SCH-02 ("DB guarantees one applied initial baseline") both rely on these two
 * indexes being unique. Both were created with table.index(), so neither enforced anything
 * despite the ux_ naming. Two Planners uploading at once would each get a queued version.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS ux_sv_one_inflight');
  await knex.raw(`
    CREATE UNIQUE INDEX ux_sv_one_inflight
      ON schedule_version (project_id)
      WHERE status IN ('queued', 'parsing')
  `);

  await knex.raw('DROP INDEX IF EXISTS ux_sv_one_initial_baseline');
  await knex.raw(`
    CREATE UNIQUE INDEX ux_sv_one_initial_baseline
      ON schedule_version (project_id)
      WHERE upload_kind = 'initial_baseline' AND status = 'applied'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP INDEX IF EXISTS ux_sv_one_inflight');
  await knex.raw(`
    CREATE INDEX ux_sv_one_inflight
      ON schedule_version (project_id)
      WHERE status IN ('queued', 'parsing')
  `);

  await knex.raw('DROP INDEX IF EXISTS ux_sv_one_initial_baseline');
  await knex.raw(`
    CREATE INDEX ux_sv_one_initial_baseline
      ON schedule_version (project_id)
      WHERE upload_kind = 'initial_baseline' AND status = 'applied'
  `);
}
