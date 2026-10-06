import type { Knex } from 'knex';

const EFFECTS_SEVERITY = ['none', 'minor', 'significant', 'stoppage'] as const;
const DPR_STATUS = ['draft', 'submitted'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr', (table) => {
    table.uuid('dpr_id').primary();
    table.string('dpr_ref').unique();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.smallint('stage_no').notNullable();
    table.date('report_date').notNullable();

    table.string('site_location', 500).notNullable();
    table.string('contract_no');
    // FK added in 20261005124245 (weather_category) once that table exists.
    table.smallint('weather_category_id');

    table.decimal('temp_min_c', 4, 1);
    table.decimal('temp_max_c', 4, 1);
    table.smallint('humidity_pct');
    table.string('wind');

    table.string('effects_text', 10000);
    table
      .enu('effects_severity', [...EFFECTS_SEVERITY], {
        useNative: true,
        enumName: 'dpr_effects_severity',
      })
      .notNullable()
      .defaultTo('none');

    table.string('equipment_text', 10000);
    table.string('visitors_text', 10000);
    table.string('delays_text', 10000);
    table.string('incidents_text', 10000);
    table.string('other_notes_text', 10000);

    table
      .enu('status', [...DPR_STATUS], { useNative: true, enumName: 'dpr_status' })
      .notNullable();

    table.uuid('author_id').notNullable().references('id').inTable('users');
    table.uuid('submitted_by').references('id').inTable('users');
    table.timestamp('submitted_at', { useTz: true });
    table.boolean('is_late');

    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');

    table.unique(['project_id', 'report_date']);

    table.check('humidity_pct BETWEEN 0 AND 100', [], 'ck_dpr_humidity_range');
    table.check(
      '(submitted_at IS NULL) = (submitted_by IS NULL)',
      [],
      'ck_dpr_submitted_pair',
    );
    table.check(
      "status = 'draft' OR submitted_at IS NOT NULL",
      [],
      'ck_dpr_submitted_when_status',
    );

    table.index(['project_id', 'stage_no', 'report_date'], 'ix_dpr_project_stage_date');
    table.index(['status', 'updated_at'], 'ix_dpr_stale_draft_sweep', {
      predicate: knex.where('status', 'draft'),
    });
  });

  await knex.raw(`
    DROP TRIGGER IF EXISTS dpr_set_updated_at ON dpr;
    CREATE TRIGGER dpr_set_updated_at
      BEFORE UPDATE ON dpr
      FOR EACH ROW
      EXECUTE FUNCTION set_updated_at();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`DROP TRIGGER IF EXISTS dpr_set_updated_at ON dpr`);
  await knex.schema.dropTableIfExists('dpr');
  for (const t of ['dpr_status', 'dpr_effects_severity']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
