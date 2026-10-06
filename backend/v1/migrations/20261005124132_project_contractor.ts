import type { Knex } from 'knex';

const PARTY_TYPES = ['contractor', 'subcontractor'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_contractor', (table) => {
    table.uuid('project_contractor_id').primary();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.uuid('contractor_id').notNullable().references('contractor_id').inTable('contractor');
    table
      .enu('party_type', [...PARTY_TYPES], { useNative: true, enumName: 'party_type' })
      .notNullable();
    table.boolean('is_active').notNullable().defaultTo(true);
    table.uuid('added_by').notNullable().references('id').inTable('users');
    table.timestamp('added_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['project_id', 'contractor_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_contractor');
  await knex.raw(`DROP TYPE IF EXISTS party_type`);
}
