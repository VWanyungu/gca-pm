export async function up(knex) {
    await knex.schema.createTable('pdm_gate_activity_template', (table) => {
        table.uuid('template_id').primary();
        table.smallint('stage_no').notNullable();
        table.string('title', 500).notNullable();
        table.string('description', 10000);
        table.boolean('requires_attachment').notNullable().defaultTo(false);
        table.integer('due_offset_days');
        table.smallint('sort_order').notNullable().defaultTo(0);
        table.boolean('is_active').notNullable().defaultTo(true);
        table.uuid('created_by').notNullable().references('id').inTable('users');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.uuid('updated_by').references('id').inTable('users');
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.check('stage_no IN (0, 11)', [], 'ck_gate_activity_template_stage_no');
        table.index(['stage_no', 'is_active', 'sort_order'], 'ix_gate_activity_template_stage');
    });
    // ponytail: triggers have no knex builder — raw stays until knex grows a trigger API.
    // Shared set_updated_at() comes from 20261005122000.
    await knex.raw(`
    DROP TRIGGER IF EXISTS pdm_gate_activity_template_set_updated_at ON pdm_gate_activity_template;
    CREATE TRIGGER pdm_gate_activity_template_set_updated_at
      BEFORE UPDATE ON pdm_gate_activity_template
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
}
export async function down(knex) {
    await knex.raw(`DROP TRIGGER IF EXISTS pdm_gate_activity_template_set_updated_at ON pdm_gate_activity_template`);
    await knex.schema.dropTableIfExists('pdm_gate_activity_template');
}
