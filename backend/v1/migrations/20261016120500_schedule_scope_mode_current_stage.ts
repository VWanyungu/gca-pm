import type { Knex } from 'knex';

/**
 * The upload screen offers full / milestones / current stage, so the stored display filter
 * becomes every_task | milestones_only | current_stage. `top_level_phases` was never offered
 * and, on real files, would have matched only the single level-1 wrapper row anyway — any
 * existing row carrying it falls back to every_task.
 *
 * Postgres cannot drop a value from an enum, so the type is rebuilt.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE schedule_scope_mode RENAME TO schedule_scope_mode_old');
  await knex.raw(`
    CREATE TYPE schedule_scope_mode AS ENUM ('milestones_only', 'current_stage', 'every_task')
  `);
  await knex.raw('ALTER TABLE schedule_version ALTER COLUMN scope_mode DROP DEFAULT');
  await knex.raw(`
    ALTER TABLE schedule_version
      ALTER COLUMN scope_mode TYPE schedule_scope_mode
      USING (
        CASE WHEN scope_mode::text = 'top_level_phases' THEN 'every_task' ELSE scope_mode::text END
      )::schedule_scope_mode
  `);
  await knex.raw(`ALTER TABLE schedule_version ALTER COLUMN scope_mode SET DEFAULT 'every_task'`);
  await knex.raw('DROP TYPE schedule_scope_mode_old');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE schedule_scope_mode RENAME TO schedule_scope_mode_new');
  await knex.raw(`
    CREATE TYPE schedule_scope_mode AS ENUM ('milestones_only', 'top_level_phases', 'every_task')
  `);
  await knex.raw('ALTER TABLE schedule_version ALTER COLUMN scope_mode DROP DEFAULT');
  await knex.raw(`
    ALTER TABLE schedule_version
      ALTER COLUMN scope_mode TYPE schedule_scope_mode
      USING (
        CASE WHEN scope_mode::text = 'current_stage' THEN 'every_task' ELSE scope_mode::text END
      )::schedule_scope_mode
  `);
  await knex.raw(`ALTER TABLE schedule_version ALTER COLUMN scope_mode SET DEFAULT 'every_task'`);
  await knex.raw('DROP TYPE schedule_scope_mode_new');
}
