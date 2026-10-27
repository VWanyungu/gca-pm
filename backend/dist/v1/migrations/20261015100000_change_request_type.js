const CR_TYPE = ['scope', 'schedule', 'cost'];
export async function up(knex) {
    await knex.schema.alterTable('change_request', (table) => {
        table
            .enu('type', [...CR_TYPE], { useNative: true, enumName: 'change_request_type' })
            .notNullable()
            .defaultTo('scope');
    });
}
export async function down(knex) {
    await knex.schema.alterTable('change_request', (table) => {
        table.dropColumn('type');
    });
    await knex.raw(`DROP TYPE IF EXISTS change_request_type`);
}
