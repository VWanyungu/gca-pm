import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('client_report_recipient', (table) => {
    table
      .uuid('send_id')
      .notNullable()
      .references('send_id')
      .inTable('client_report_send')
      .onDelete('CASCADE');
    table.string('email').notNullable();
    table
      .uuid('client_contact_id')
      .references('contact_id')
      .inTable('client_contacts');
    table.string('recipient_name');

    table.primary(['send_id', 'email']);
    table.index(['send_id'], 'ix_crr_send');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('client_report_recipient');
}
