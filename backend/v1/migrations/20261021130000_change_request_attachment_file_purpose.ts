import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TYPE file_purpose ADD VALUE 'change_request_attachment'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE file_purpose RENAME TO file_purpose_old');
  await knex.raw(`
    CREATE TYPE file_purpose AS ENUM ('dpr_photo', 'activity_attachment', 'schedule_mpp', 'client_report_pdf')
  `);
  await knex.raw(`
    ALTER TABLE file_object
      ALTER COLUMN purpose TYPE file_purpose
      USING (purpose::text)::file_purpose
  `);
  await knex.raw('DROP TYPE file_purpose_old');
}
