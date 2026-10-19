import knex from 'knex';
import { types } from 'pg';
import config from '../../knexfile.js';

// Without this, node-postgres parses `date` columns into JS Date objects at local
// midnight, which then serialize to the *previous* day's UTC timestamp whenever the
// server's local time zone is ahead of UTC (e.g. Africa/Nairobi, UTC+3) — shifting
// every date-only field (report_date, due dates, etc.) back a day for API consumers.
// Returning the raw 'YYYY-MM-DD' string instead avoids that.
types.setTypeParser(types.builtins.DATE, (val) => val);

const db = knex(config);

export default db;
