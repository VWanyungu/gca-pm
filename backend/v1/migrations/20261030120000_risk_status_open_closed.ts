import type { Knex } from 'knex';

/**
 * Risk status collapses to open/closed. `mitigated` and `dismissed` were only ever there to
 * give an overdue-task risk its own "Address"/"Dismiss" buttons — those risks are raised by
 * hand from the Overdue tab now (20261016150000), so they are ordinary risks and the PM closes
 * them like any other. `auto_resolved` folds into `closed` too; `auto_resolution_reason` still
 * records why the system closed it.
 *
 * The enum value itself stays — dropping one means recreating the type, and an unused value
 * costs nothing (see 20261026140000).
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE risk SET status = 'closed' WHERE status IN ('mitigated', 'dismissed', 'auto_resolved')
  `);

  await knex.schema.alterTable('risk', (table) => {
    table.dropChecks([
      'ck_risk_dismissal_reason_required',
      'ck_risk_auto_resolution_reason_required',
      'ck_risk_closed_at_for_terminal',
    ]);
    table.check('(status <> \'open\') = (closed_at IS NOT NULL)', [], 'ck_risk_closed_at_for_terminal');
  });

  await knex.raw(`DROP INDEX IF EXISTS ix_risk_owner_open`);
  await knex.raw(`
    CREATE INDEX ix_risk_owner_open ON risk (owner_id) WHERE status = 'open'
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP INDEX IF EXISTS ix_risk_owner_open`);
  await knex.raw(`
    CREATE INDEX ix_risk_owner_open ON risk (owner_id) WHERE status IN ('open', 'mitigated')
  `);

  await knex.schema.alterTable('risk', (table) => {
    table.dropChecks(['ck_risk_closed_at_for_terminal']);
    table.check(
      "status <> 'dismissed' OR dismissal_reason IS NOT NULL",
      [],
      'ck_risk_dismissal_reason_required',
    );
    table.check(
      "status <> 'auto_resolved' OR auto_resolution_reason IS NOT NULL",
      [],
      'ck_risk_auto_resolution_reason_required',
    );
    table.check(
      "(status IN ('mitigated','closed','dismissed','auto_resolved')) = (closed_at IS NOT NULL)",
      [],
      'ck_risk_closed_at_for_terminal',
    );
  });

  // Which closed rows were once mitigated/dismissed/auto_resolved is not recorded, so the
  // status values themselves cannot be restored.
}
