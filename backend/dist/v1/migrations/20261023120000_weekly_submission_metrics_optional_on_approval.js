/**
 * AC-WKS-05 (1) allows `planned_pct` / `actual_pct` to be null on an approved submission when
 * the project has no usable schedule ("flagged no schedule"). `ck_ws_required_on_approval`
 * demanded both NOT NULL, so the approval path had to substitute 0.00 to get the row in —
 * which the client report reads as a real figure and prints as "Work complete 0%".
 *
 * Dropping the two columns from the check lets approval say "no position to report". The rest
 * of the check (the narrative fields and `approved_at`) is unchanged, and the new check is
 * strictly weaker, so no existing row can violate it.
 */
const WITH_METRICS = "status <> 'approved' OR (top_risk_text IS NOT NULL AND top_action IS NOT NULL AND pm_commentary IS NOT NULL AND approved_at IS NOT NULL AND planned_pct IS NOT NULL AND actual_pct IS NOT NULL)";
const WITHOUT_METRICS = "status <> 'approved' OR (top_risk_text IS NOT NULL AND top_action IS NOT NULL AND pm_commentary IS NOT NULL AND approved_at IS NOT NULL)";
export async function up(knex) {
    await knex.raw(`ALTER TABLE weekly_submission DROP CONSTRAINT ck_ws_required_on_approval,
       ADD CONSTRAINT ck_ws_required_on_approval CHECK (${WITHOUT_METRICS})`);
}
export async function down(knex) {
    // Rows approved without a schedule would block the old check; give them back the 0.00 the
    // approval path used to write, so the rollback cannot fail halfway.
    await knex('weekly_submission')
        .where({ status: 'approved' })
        .whereNull('planned_pct')
        .update({ planned_pct: 0, actual_pct: 0 });
    await knex.raw(`ALTER TABLE weekly_submission DROP CONSTRAINT ck_ws_required_on_approval,
       ADD CONSTRAINT ck_ws_required_on_approval CHECK (${WITH_METRICS})`);
}
