import type { Knex } from 'knex';

const FILE_PURPOSE = [
  'dpr_photo',
  'activity_attachment',
  'schedule_mpp',
  'client_report_pdf',
] as const;
const FILE_VARIANT = ['original', 'thumbnail', 'display'] as const;
const FILE_STATUS = ['pending_upload', 'scanning', 'available', 'rejected'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('file_object', (table) => {
    table.uuid('file_id').primary();
    table.uuid('project_id').references('project_id').inTable('projects');
    table
      .enu('purpose', [...FILE_PURPOSE], { useNative: true, enumName: 'file_purpose' })
      .notNullable();
    table.uuid('parent_file_id').references('file_id').inTable('file_object');
    table
      .enu('variant', [...FILE_VARIANT], { useNative: true, enumName: 'file_variant' })
      .notNullable();
    table.string('storage_key', 1000).notNullable().unique();
    table.string('original_filename', 500).notNullable();
    table.string('mime_type').notNullable();
    table.bigint('size_bytes').notNullable();
    table.specificType('sha256', 'char(64)').notNullable();
    table.integer('width_px');
    table.integer('height_px');
    table
      .enu('status', [...FILE_STATUS], { useNative: true, enumName: 'file_status' })
      .notNullable();
    table.string('rejection_reason', 10000);
    table.uuid('uploaded_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('deleted_at', { useTz: true });

    table.check(
      "status <> 'rejected' OR rejection_reason IS NOT NULL",
      [],
      'ck_file_rejection_reason_required',
    );

    table.index(['project_id', 'purpose'], 'ix_file_project_purpose');
    table.index(['parent_file_id'], 'ix_file_parent');
    table.index(['status', 'created_at'], 'ix_file_orphan_sweep', {
      predicate: knex.where('status', 'pending_upload'),
    });
    table.index(['deleted_at'], 'ix_file_soft_deleted', {
      predicate: knex.whereNotNull('deleted_at'),
    });
  });

  // Wire the FKs that earlier migrations had to defer.
  await knex.schema.alterTable('stage_activity_attachment', (table) => {
    table.foreign('file_id').references('file_id').inTable('file_object');
  });
  await knex.schema.alterTable('schedule_version', (table) => {
    table.foreign('source_file_id').references('file_id').inTable('file_object');
  });
  await knex.schema.alterTable('dpr_photo', (table) => {
    table.foreign('file_id').references('file_id').inTable('file_object');
  });
  await knex.schema.alterTable('client_report_send', (table) => {
    table.foreign('pdf_file_id').references('file_id').inTable('file_object');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('client_report_send', (table) => {
    table.dropForeign('pdf_file_id');
  });
  await knex.schema.alterTable('dpr_photo', (table) => {
    table.dropForeign('file_id');
  });
  await knex.schema.alterTable('schedule_version', (table) => {
    table.dropForeign('source_file_id');
  });
  await knex.schema.alterTable('stage_activity_attachment', (table) => {
    table.dropForeign('file_id');
  });
  await knex.schema.dropTableIfExists('file_object');
  for (const t of ['file_status', 'file_variant', 'file_purpose']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
