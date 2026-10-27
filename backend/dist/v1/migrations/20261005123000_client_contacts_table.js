export async function up(knex) {
    if (await knex.schema.hasTable('client_contacts'))
        return;
    await knex.schema.createTable('client_contacts', (table) => {
        table.uuid('contact_id').primary();
        table
            .uuid('project_id')
            .notNullable()
            .references('project_id')
            .inTable('projects')
            .onDelete('CASCADE')
            .index();
        table.string('name').notNullable();
        table.string('email').notNullable();
        table.string('title', 500);
        table.boolean('receives_reports').notNullable().defaultTo(false);
    });
}
export async function down(knex) {
    await knex.schema.dropTableIfExists('client_contacts');
}
