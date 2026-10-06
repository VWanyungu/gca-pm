import type { Knex } from 'knex';

const PREF_CHANNEL = ['in_app', 'email'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_preference', (table) => {
    table
      .uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table
      .string('type_code')
      .notNullable()
      .references('type_code')
      .inTable('notification_type');
    table
      .enu('channel', [...PREF_CHANNEL], {
        useNative: true,
        enumName: 'notification_pref_channel',
      })
      .notNullable();
    table.boolean('enabled').notNullable();
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['user_id', 'type_code', 'channel']);
  });

  await knex.raw(`
    DROP TRIGGER IF EXISTS notification_preference_set_updated_at ON notification_preference;
    CREATE TRIGGER notification_preference_set_updated_at
      BEFORE UPDATE ON notification_preference
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    `DROP TRIGGER IF EXISTS notification_preference_set_updated_at ON notification_preference`,
  );
  await knex.schema.dropTableIfExists('notification_preference');
  await knex.raw(`DROP TYPE IF EXISTS notification_pref_channel`);
}
