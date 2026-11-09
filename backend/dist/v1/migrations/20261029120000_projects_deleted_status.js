/**
 * Adds 'deleted' as a project status for admin soft-delete (AC-PRJ-11): the row
 * stays (audit trail, FKs intact), but the project is hidden from normal
 * list/get views. `status` and `project_status_history.*_status` are plain
 * varchar + CHECK constraints here (not native Postgres enums), so widening
 * them is an ordinary transactional DDL change — no ALTER TYPE ADD VALUE
 * hazard like the change_request_status migrations.
 */
export async function up(knex) {
    await knex.raw(`
    ALTER TABLE projects DROP CONSTRAINT projects_status_check;
    ALTER TABLE projects ADD CONSTRAINT projects_status_check
      CHECK (status = ANY (ARRAY['active', 'on_hold', 'complete', 'cancelled', 'deleted']));
  `);
    await knex.raw(`
    ALTER TABLE project_status_history DROP CONSTRAINT project_status_history_from_status_check;
    ALTER TABLE project_status_history ADD CONSTRAINT project_status_history_from_status_check
      CHECK (from_status = ANY (ARRAY['active', 'on_hold', 'complete', 'cancelled', 'deleted']));

    ALTER TABLE project_status_history DROP CONSTRAINT project_status_history_to_status_check;
    ALTER TABLE project_status_history ADD CONSTRAINT project_status_history_to_status_check
      CHECK (to_status = ANY (ARRAY['active', 'on_hold', 'complete', 'cancelled', 'deleted']));
  `);
}
export async function down(knex) {
    await knex.raw(`
    ALTER TABLE project_status_history DROP CONSTRAINT project_status_history_to_status_check;
    ALTER TABLE project_status_history ADD CONSTRAINT project_status_history_to_status_check
      CHECK (to_status = ANY (ARRAY['active', 'on_hold', 'complete', 'cancelled']));

    ALTER TABLE project_status_history DROP CONSTRAINT project_status_history_from_status_check;
    ALTER TABLE project_status_history ADD CONSTRAINT project_status_history_from_status_check
      CHECK (from_status = ANY (ARRAY['active', 'on_hold', 'complete', 'cancelled']));
  `);
    await knex.raw(`
    ALTER TABLE projects DROP CONSTRAINT projects_status_check;
    ALTER TABLE projects ADD CONSTRAINT projects_status_check
      CHECK (status = ANY (ARRAY['active', 'on_hold', 'complete', 'cancelled']));
  `);
}
