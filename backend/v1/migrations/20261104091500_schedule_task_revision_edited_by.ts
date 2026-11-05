import type { Knex } from 'knex';

/** Who made a `manual_edit` revision; null for `upload`/`dpr_writeback` sources, which already
 *  attribute via schedule_version.uploaded_by / dpr_activity_progress respectively. */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_task_revision', (table) => {
    table.uuid('edited_by').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_task_revision', (table) => {
    table.dropColumn('edited_by');
  });
}
