const STAGE_KINDS = ['kickoff', 'pdm', 'closure'];
export async function up(knex) {
    await knex.schema.alterTable('pdm_stage', (table) => {
        table
            .enu('kind', [...STAGE_KINDS], { useNative: true, enumName: 'pdm_stage_kind' })
            .notNullable()
            .defaultTo('pdm');
    });
    await knex.raw('ALTER TABLE pdm_stage DROP CONSTRAINT pdm_stage_stage_no_check');
    await knex.schema.alterTable('pdm_stage', (table) => {
        table.check('stage_no BETWEEN 0 AND 11', [], 'pdm_stage_stage_no_check');
    });
    await knex('pdm_stage')
        .insert([
        { stage_no: 0, phase_id: 1, name: 'Kickoff', kind: 'kickoff' },
        { stage_no: 11, phase_id: 3, name: 'Closure', kind: 'closure' },
    ])
        .onConflict('stage_no')
        .ignore();
}
export async function down(knex) {
    await knex('pdm_stage').whereIn('stage_no', [0, 11]).delete();
    await knex.raw('ALTER TABLE pdm_stage DROP CONSTRAINT pdm_stage_stage_no_check');
    await knex.schema.alterTable('pdm_stage', (table) => {
        table.check('stage_no BETWEEN 1 AND 10', [], 'pdm_stage_stage_no_check');
    });
    await knex.schema.alterTable('pdm_stage', (table) => {
        table.dropColumn('kind');
    });
    await knex.raw('DROP TYPE IF EXISTS pdm_stage_kind');
}
