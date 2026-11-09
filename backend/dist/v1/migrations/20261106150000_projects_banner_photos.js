export async function up(knex) {
    const hasCol = await knex.schema.hasColumn('projects', 'banner_photos');
    if (!hasCol) {
        await knex.schema.alterTable('projects', (table) => {
            table.jsonb('banner_photos').notNullable().defaultTo('[]');
        });
    }
}
export async function down(knex) {
    const hasCol = await knex.schema.hasColumn('projects', 'banner_photos');
    if (hasCol) {
        await knex.schema.alterTable('projects', (table) => {
            table.dropColumn('banner_photos');
        });
    }
}
