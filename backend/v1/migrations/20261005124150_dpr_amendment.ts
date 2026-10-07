import type { Knex } from 'knex';

const AMENDMENT_STATUS = ['pending', 'approved', 'rejected', 'withdrawn'] as const;
const WRITEBACK_OUTCOMES = ['applied', 'skipped_stale_schedule', 'no_change'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_amendment', (table) => {
    table.uuid('amendment_id').primary();
    table.uuid('dpr_id').notNullable().references('dpr_id').inTable('dpr');
    table.smallint('amendment_no').notNullable();
    table.string('reason', 10000).notNullable();
    table.jsonb('proposed_document').notNullable();
    table
      .enu('status', [...AMENDMENT_STATUS], {
        useNative: true,
        enumName: 'dpr_amendment_status',
      })
      .notNullable();

    table.uuid('requested_by').notNullable().references('id').inTable('users');
    table.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('decided_by').references('id').inTable('users');
    table.timestamp('decided_at', { useTz: true });
    table.string('decision_note', 10000);
    table.jsonb('before_snapshot');
    table.timestamp('applied_at', { useTz: true });
    table
      .enu('writeback_outcome', [...WRITEBACK_OUTCOMES], {
        useNative: true,
        enumName: 'dpr_amendment_writeback_outcome',
      });

    table.unique(['dpr_id', 'amendment_no']);

    table.check(
      '(decided_at IS NULL) = (decided_by IS NULL)',
      [],
      'ck_dpra_decision_pair',
    );
    table.check(
      "status <> 'rejected' OR decision_note IS NOT NULL",
      [],
      'ck_dpra_reject_note_required',
    );
    table.check(
      "(status = 'approved') = (applied_at IS NOT NULL)",
      [],
      'ck_dpra_applied_when_approved',
    );
    table.check(
      "(status = 'approved') = (before_snapshot IS NOT NULL)",
      [],
      'ck_dpra_snapshot_when_approved',
    );
    table.check(
      "(status = 'approved') = (writeback_outcome IS NOT NULL)",
      [],
      'ck_dpra_writeback_when_approved',
    );

    table.index(['dpr_id'], 'ix_dpra_dpr');
    table.index(['status'], 'ix_dpra_pending', {
      predicate: knex.queryBuilder().whereRaw('"status" = \'pending\''),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_amendment');
  for (const t of ['dpr_amendment_writeback_outcome', 'dpr_amendment_status']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
