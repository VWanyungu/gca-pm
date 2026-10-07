import type { Knex } from 'knex';

const SEND_STATUS = ['queued', 'sent', 'failed'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('client_report_send', (table) => {
    table.uuid('send_id').primary();
    table
      .uuid('submission_id')
      .notNullable()
      .references('submission_id')
      .inTable('weekly_submission');
    // FK added in 20261005124235 (file_object) once that table exists.
    table.uuid('pdf_file_id').notNullable();
    table
      .enu('status', [...SEND_STATUS], { useNative: true, enumName: 'client_report_send_status' })
      .notNullable();
    table.string('failure_reason', 10000);
    table.string('provider_message_id');
    table.uuid('sent_by').notNullable().references('id').inTable('users');
    table.timestamp('requested_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('sent_at', { useTz: true });

    table.check(
      "status <> 'failed' OR failure_reason IS NOT NULL",
      [],
      'ck_crs_failure_reason_required',
    );
    table.check(
      "(status = 'sent') = (sent_at IS NOT NULL)",
      [],
      'ck_crs_sent_at_when_sent',
    );

    table.index(['submission_id'], 'ix_crs_submission');
    table.index(['status', 'requested_at'], 'ix_crs_queue', {
      predicate: knex.queryBuilder().whereRaw('"status" = \'queued\''),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client_report_send');
  await knex.raw(`DROP TYPE IF EXISTS client_report_send_status`);
}
