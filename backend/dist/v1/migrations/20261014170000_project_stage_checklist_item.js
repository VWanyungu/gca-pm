export async function up(knex) {
    await knex.schema.createTable('project_stage_checklist_item', (table) => {
        table.uuid('item_id').primary();
        table.uuid('project_id').notNullable();
        table.smallint('stage_no').notNullable();
        table.string('text', 10000).notNullable();
        table.smallint('sort_order').notNullable().defaultTo(0);
        table.boolean('is_checked').notNullable().defaultTo(false);
        table.uuid('created_by').notNullable().references('id').inTable('users');
        table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table.uuid('updated_by').notNullable().references('id').inTable('users');
        table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        table
            .foreign(['project_id', 'stage_no'])
            .references(['project_id', 'stage_no'])
            .inTable('project_stage');
        table.index(['project_id', 'stage_no', 'sort_order'], 'ix_psci_project_stage');
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('project_stage_checklist_item');
}
