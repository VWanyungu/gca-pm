/**
 * A planner can now edit a schedule task's own dates/progress directly from the app, without
 * re-uploading a file. Those edits are recorded as a new revision source, `manual_edit`,
 * alongside the existing `upload` and `dpr_writeback`.
 *
 * Postgres cannot add a value mid-transaction and keep using it, so the type is rebuilt
 * (same approach as 20261016120500_schedule_scope_mode_current_stage.ts). Unlike scope_mode,
 * `source` has a CHECK constraint and a partial index that compare it to a literal, and both
 * bake in the old type's OID — they must be dropped before the rebuild and recreated after, or
 * Postgres refuses the ALTER COLUMN TYPE with "operator does not exist: revision_source =
 * revision_source_old".
 */
export async function up(knex) {
    await knex.raw('ALTER TABLE schedule_task_revision DROP CONSTRAINT ck_str_writeback_source');
    await knex.raw('ALTER TABLE schedule_task_revision DROP CONSTRAINT ck_str_writeback_modifies_only');
    await knex.raw('DROP INDEX ix_str_upload_per_version');
    await knex.raw('ALTER TYPE revision_source RENAME TO revision_source_old');
    await knex.raw(`CREATE TYPE revision_source AS ENUM ('upload', 'dpr_writeback', 'manual_edit')`);
    await knex.raw(`
    ALTER TABLE schedule_task_revision
      ALTER COLUMN source TYPE revision_source
      USING (source::text)::revision_source
  `);
    await knex.raw('DROP TYPE revision_source_old');
    await knex.raw(`
    ALTER TABLE schedule_task_revision
      ADD CONSTRAINT ck_str_writeback_source
      CHECK ((source = 'dpr_writeback') = (dpr_activity_progress_id IS NOT NULL))
  `);
    await knex.raw(`
    ALTER TABLE schedule_task_revision
      ADD CONSTRAINT ck_str_writeback_modifies_only
      CHECK (source = 'upload' OR change_type = 'modified')
  `);
    await knex.raw(`
    CREATE INDEX ix_str_upload_per_version ON schedule_task_revision (schedule_version_id)
      WHERE source = 'upload'
  `);
}
export async function down(knex) {
    await knex.raw('ALTER TABLE schedule_task_revision DROP CONSTRAINT ck_str_writeback_source');
    await knex.raw('ALTER TABLE schedule_task_revision DROP CONSTRAINT ck_str_writeback_modifies_only');
    await knex.raw('DROP INDEX ix_str_upload_per_version');
    // Best-effort escape hatch: a manual edit has no narrower source to fall back to, so it
    // becomes indistinguishable from an upload rather than blocking the rollback.
    await knex.raw(`UPDATE schedule_task_revision SET source = 'upload' WHERE source = 'manual_edit'`);
    await knex.raw('ALTER TYPE revision_source RENAME TO revision_source_new');
    await knex.raw(`CREATE TYPE revision_source AS ENUM ('upload', 'dpr_writeback')`);
    await knex.raw(`
    ALTER TABLE schedule_task_revision
      ALTER COLUMN source TYPE revision_source
      USING (source::text)::revision_source
  `);
    await knex.raw('DROP TYPE revision_source_new');
    await knex.raw(`
    ALTER TABLE schedule_task_revision
      ADD CONSTRAINT ck_str_writeback_source
      CHECK ((source = 'dpr_writeback') = (dpr_activity_progress_id IS NOT NULL))
  `);
    await knex.raw(`
    ALTER TABLE schedule_task_revision
      ADD CONSTRAINT ck_str_writeback_modifies_only
      CHECK (source = 'upload' OR change_type = 'modified')
  `);
    await knex.raw(`
    CREATE INDEX ix_str_upload_per_version ON schedule_task_revision (schedule_version_id)
      WHERE source = 'upload'
  `);
}
