import type { Knex } from 'knex';

const SCHEDULE_UPLOAD_STATUSES = ['queued', 'parsing', 'applied', 'failed'] as const;
const SCHEDULE_UPLOAD_KINDS = ['regular', 'initial_baseline', 'rebaseline'] as const;
const SCHEDULE_SCOPE_MODES = ['milestones_only', 'top_level_phases', 'every_task'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedule_version', (table) => {
    table.uuid('schedule_version_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.integer('version_no');
    table
      .enu('status', [...SCHEDULE_UPLOAD_STATUSES], {
        useNative: true,
        enumName: 'schedule_upload_status',
      })
      .notNullable()
      .defaultTo('queued');
    table
      .enu('upload_kind', [...SCHEDULE_UPLOAD_KINDS], {
        useNative: true,
        enumName: 'schedule_upload_kind',
      })
      .notNullable()
      .defaultTo('regular');
    table.uuid('change_request_id');
    table
      .enu('scope_mode', [...SCHEDULE_SCOPE_MODES], {
        useNative: true,
        enumName: 'schedule_scope_mode',
      })
      .notNullable()
      .defaultTo('every_task');
    table.date('status_date');
    table.uuid('source_file_id').notNullable();
    table.specificType('file_sha256', 'char(64)').notNullable();
    table.integer('tasks_added');
    table.integer('tasks_removed');
    table.integer('tasks_modified');
    table.integer('pct_overwrites');
    table.integer('overdue_risks_created');
    table.jsonb('parse_diagnostics');
    table.uuid('uploaded_by').notNullable().references('id').inTable('users');
    table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('applied_at', { useTz: true });

    table.unique(['project_id', 'version_no']);
    table.check('version_no > 0', [], 'schedule_version_version_no_check');
    table.check(
      "(status = 'applied') = (version_no IS NOT NULL)",
      [],
      'ck_sv_version_when_applied',
    );
    table.check("(status = 'applied') = (applied_at IS NOT NULL)", [], 'ck_sv_applied_at');
    table.check(
      "(status = 'applied') = (tasks_added IS NOT NULL AND tasks_removed IS NOT NULL AND tasks_modified IS NOT NULL AND pct_overwrites IS NOT NULL)",
      [],
      'ck_sv_counts_when_applied',
    );
    table.check(
      "status <> 'failed' OR parse_diagnostics IS NOT NULL",
      [],
      'ck_sv_failed_diagnostics',
    );
    table.check(
      "(upload_kind = 'rebaseline') = (change_request_id IS NOT NULL)",
      [],
      'ck_sv_rebaseline_cr',
    );

    table.index(['project_id'], 'ux_sv_one_inflight', {
      predicate: knex.whereIn('status', ['queued', 'parsing']),
    });
    table.index(['project_id'], 'ux_sv_one_initial_baseline', {
      predicate: knex.where('upload_kind', 'initial_baseline').where('status', 'applied'),
    });
    table.index(['project_id', 'version_no'], 'ix_sv_project_applied', {
      predicate: knex.where('status', 'applied'),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedule_version');
  for (const t of ['schedule_scope_mode', 'schedule_upload_kind', 'schedule_upload_status']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
