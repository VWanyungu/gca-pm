import type { Knex } from 'knex';

const EFFECTS_SEVERITY = ['none', 'minor', 'significant', 'stoppage'] as const;
const DPR_STATUS = ['draft', 'submitted'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr', (table) => {
    table.uuid('dpr_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('dpr_ref').unique();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.smallint('stage_no').notNullable();
    table.date('report_date').notNullable();

    // ponytail: FKs to shift_type and weather_category deferred — tables land in Step 8.
    table.uuid('shift_type_id').notNullable();
    table.text('site_location').notNullable();
    table.text('contract_no');
    table.uuid('weather_category_id');

    table.decimal('temp_min_c', 4, 1);
    table.decimal('temp_max_c', 4, 1);
    table.smallint('humidity_pct');
    table.text('wind');

    table.text('effects_text');
    table
      .enu('effects_severity', [...EFFECTS_SEVERITY], {
        useNative: true,
        enumName: 'dpr_effects_severity',
      })
      .notNullable()
      .defaultTo('none');

    table.text('equipment_text');
    table.text('visitors_text');
    table.text('delays_text');
    table.text('incidents_text');
    table.text('other_notes_text');

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
