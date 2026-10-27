/**
 * Overdue tasks no longer become risks on their own. They are listed on the schedule's
 * Overdue tab and the PM raises a risk from one when it is worth tracking, so two names
 * stop being true:
 *
 *  - `risk_source = 'auto_overdue_task'` — nothing is automatic about it now. The value
 *    still means "this risk came from a schedule task", which is what keeps the Overdue tab
 *    able to show "Risk raised" against the task.
 *  - `schedule_version.overdue_risks_created` — no risks are created by an upload. The
 *    useful number to keep per version is how many tasks were overdue when it landed.
 *
 * Postgres rewrites the check constraint that mentions the column, so ck_sv_counts_nonneg
 * follows the rename on its own.
 */
export async function up(knex) {
    await knex.raw(`ALTER TYPE risk_source RENAME VALUE 'auto_overdue_task' TO 'overdue_task'`);
    await knex.raw(`ALTER TABLE schedule_version RENAME COLUMN overdue_risks_created TO overdue_task_count`);
}
export async function down(knex) {
    await knex.raw(`ALTER TABLE schedule_version RENAME COLUMN overdue_task_count TO overdue_risks_created`);
    await knex.raw(`ALTER TYPE risk_source RENAME VALUE 'overdue_task' TO 'auto_overdue_task'`);
}
