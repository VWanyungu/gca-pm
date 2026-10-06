import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('holiday', (table) => {
    table
      .smallint('calendar_id')
      .notNullable()
      .references('calendar_id')
      .inTable('holiday_calendar')
      .onDelete('CASCADE');
    table.date('holiday_date').notNullable();
    table.string('name').notNullable();

    table.primary(['calendar_id', 'holiday_date']);
  });

  // ponytail: 2026 Kenya fixed-date + Easter holidays. Eid/Idd dates are lunar and must be
  // added by Admin each year; this seed covers the known ones so planning works out of the box.
  const kenya = await knex('holiday_calendar').select('calendar_id').where({ name: 'Kenya public holidays' }).first();
  if (kenya) {
    await knex('holiday')
      .insert([
        { calendar_id: kenya.calendar_id, holiday_date: '2026-01-01', name: "New Year's Day" },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-04-03', name: 'Good Friday' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-04-06', name: 'Easter Monday' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-05-01', name: 'Labour Day' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-06-01', name: 'Madaraka Day' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-10-10', name: 'Huduma Day' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-10-20', name: 'Mashujaa Day' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-12-12', name: 'Jamhuri Day' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-12-25', name: 'Christmas Day' },
        { calendar_id: kenya.calendar_id, holiday_date: '2026-12-26', name: 'Boxing Day' },
      ])
      .onConflict(['calendar_id', 'holiday_date'])
      .ignore();
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('holiday');
}
