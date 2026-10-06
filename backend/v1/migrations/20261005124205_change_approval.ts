import type { Knex } from 'knex';

const APPROVER_ROLE = ['exco', 'finance'] as const;
const DECISION = ['approve', 'reject'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('change_approval', (table) => {
    table.uuid('approval_id').primary();
    table
      .uuid('change_id')
      .notNullable()
      .references('change_id')
      .inTable('change_request');
    table
      .enu('approver_role', [...APPROVER_ROLE], {
        useNative: true,
        enumName: 'change_approver_role',
      })
      .notNullable();
    table.uuid('approver_id').notNullable().references('id').inTable('users');
    table
      .enu('decision', [...DECISION], { useNative: true, enumName: 'change_decision' })
      .notNullable();
    table.string('comment', 10000);
    table.timestamp('decided_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check(
      "decision <> 'reject' OR comment IS NOT NULL",
      [],
      'ck_ca_reject_comment_required',
    );

    table.index(['change_id'], 'ix_ca_change');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('change_approval');
  for (const t of ['change_decision', 'change_approver_role']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
