import type { Knex } from 'knex';

const TABLES_WITH_UPDATED_AT = ['users', 'projects'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const t of TABLES_WITH_UPDATED_AT) {
    await knex.raw(`
      DROP TRIGGER IF EXISTS ${t}_set_updated_at ON ${t};
      CREATE TRIGGER ${t}_set_updated_at
      BEFORE UPDATE ON ${t}
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const t of TABLES_WITH_UPDATED_AT) {
    await knex.raw(`DROP TRIGGER IF EXISTS ${t}_set_updated_at ON ${t};`);
  }
  await knex.raw(`DROP FUNCTION IF EXISTS set_updated_at();`);
}
