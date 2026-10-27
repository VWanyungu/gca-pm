const USER_IDS = {
    ADMIN: '10000000-0000-0000-0000-000000000001',
    PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
    PM: '10000000-0000-0000-0000-000000000004',
    SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
};
const PROJECT_ID = '20000000-0000-0000-0000-000000000001';
const TEMPLATE_ID = '51000000-0000-0000-0000-000000000001';
const CHECKLIST_ITEM_IDS = [
    '51000000-0000-0000-0000-000000000002',
    '51000000-0000-0000-0000-000000000003',
];
const ACTIVITY_ID = '51000000-0000-0000-0000-000000000004';
export async function seed(knex) {
    const template = {
        template_id: TEMPLATE_ID,
        stage_no: 7,
        version_no: 1,
        is_current: true,
        created_by: USER_IDS.PM,
    };
    await knex('stage_checklist_template')
        .insert(template)
        .onConflict('template_id')
        .merge({
        stage_no: template.stage_no,
        version_no: template.version_no,
        is_current: template.is_current,
        created_by: template.created_by,
    });
    const checklistItems = [
        {
            item_id: CHECKLIST_ITEM_IDS[0],
            template_id: TEMPLATE_ID,
            stage_no: 7,
            sort_order: 1,
            text: 'Construction permits and site access are confirmed.',
        },
        {
            item_id: CHECKLIST_ITEM_IDS[1],
            template_id: TEMPLATE_ID,
            stage_no: 7,
            sort_order: 2,
            text: 'Safety induction and emergency procedures are in place.',
        },
    ];
    await knex('stage_checklist_item')
        .insert(checklistItems)
        .onConflict('item_id')
        .merge(['template_id', 'stage_no', 'sort_order', 'text']);
    await knex('project_stage_checklist_response')
        .insert(checklistItems.map((item, index) => ({
        project_id: PROJECT_ID,
        stage_no: item.stage_no,
        item_id: item.item_id,
        is_checked: index === 0,
        note: index === 0 ? 'Site permits verified.' : null,
        updated_by: USER_IDS.SITE_ENGINEER,
    })))
        .onConflict(['project_id', 'stage_no', 'item_id'])
        .merge(['is_checked', 'note', 'updated_by', 'updated_at']);
    await knex('stage_activity')
        .insert({
        activity_id: ACTIVITY_ID,
        project_id: PROJECT_ID,
        stage_no: 7,
        title: 'Complete LPG storage tank foundation',
        description: 'Prepare and inspect the foundation before tank installation.',
        status: 'in_progress',
        due_date: '2026-11-15',
        owner_id: USER_IDS.SITE_ENGINEER,
        created_by: USER_IDS.PM,
    })
        .onConflict('activity_id')
        .merge([
        'project_id',
        'stage_no',
        'title',
        'description',
        'status',
        'due_date',
        'owner_id',
        'created_by',
        'updated_at',
    ]);
    await knex('project_status_history')
        .insert({
        history_id: '51000000-0000-0000-0000-000000000005',
        project_id: PROJECT_ID,
        from_status: 'on_hold',
        to_status: 'active',
        reason: 'Mobilisation prerequisites have been completed.',
        actor_id: USER_IDS.ADMIN,
        changed_at: '2026-10-12T08:00:00Z',
    })
        .onConflict('history_id')
        .merge([
        'project_id',
        'from_status',
        'to_status',
        'reason',
        'actor_id',
        'changed_at',
    ]);
    await knex('stage_state_history')
        .insert({
        event_id: '51000000-0000-0000-0000-000000000006',
        project_id: PROJECT_ID,
        stage_no: 7,
        event: 'activated',
        from_state: 'not_started',
        to_state: 'active',
        reason: 'Construction mobilisation started.',
        actor_id: USER_IDS.PM,
        occurred_at: '2026-10-12T08:30:00Z',
    })
        .onConflict('event_id')
        .merge([
        'project_id',
        'stage_no',
        'event',
        'from_state',
        'to_state',
        'reason',
        'actor_id',
        'occurred_at',
    ]);
    await knex('custom_milestones')
        .insert({
        milestone_id: '51000000-0000-0000-0000-000000000007',
        project_id: PROJECT_ID,
        stage_no: 7,
        title: 'Complete tank foundation',
        planned_date: '2026-11-15',
        forecast_date: '2026-11-15',
        notes: 'Foundation inspection is the predecessor to tank installation.',
        created_by: USER_IDS.PM,
        updated_by: USER_IDS.PM,
    })
        .onConflict('milestone_id')
        .merge([
        'project_id',
        'stage_no',
        'title',
        'planned_date',
        'forecast_date',
        'notes',
        'updated_by',
        'updated_at',
    ]);
    const calendar = await knex('holiday_calendar')
        .select('calendar_id')
        .where({ name: 'Kenya public holidays' })
        .first();
    if (!calendar)
        throw new Error('Seeded Kenya holiday calendar was not found');
    const holidays = [
        { calendar_id: calendar.calendar_id, holiday_date: '2026-01-01', name: "New Year's Day" },
        { calendar_id: calendar.calendar_id, holiday_date: '2026-12-12', name: 'Jamhuri Day' },
    ];
    await knex('holiday')
        .insert(holidays)
        .onConflict(['calendar_id', 'holiday_date'])
        .merge(['name']);
    await knex('project_calendar_exception')
        .insert({
        project_id: PROJECT_ID,
        exception_date: '2026-10-17',
        is_working_day: true,
        reason: 'Scheduled construction work.',
        created_by: USER_IDS.PM,
    })
        .onConflict(['project_id', 'exception_date'])
        .merge(['is_working_day', 'reason', 'created_by']);
}
