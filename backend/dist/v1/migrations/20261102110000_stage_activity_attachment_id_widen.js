// Completes the no-op stub in 20261012160000: the router stores the Cloudinary secure URL (or a
// random UUID as a fallback) directly in attachment_id, but the column was still `uuid`, so any
// real URL failed with a Postgres 22P02 "invalid input syntax" the moment someone tried to
// attach a real file. Widening to text lets the existing, already-shipped router code work.
//
// ponytail: attachment_id is the primary key, and knex's table.alter() tries to reassert
// NOT NULL as part of a generic column-type change, which Postgres refuses on a PK column
// ("column is in a primary key"). Raw SQL changes only the type, leaving the PK/NOT NULL alone.
export async function up(knex) {
    await knex.raw('ALTER TABLE stage_activity_attachment ALTER COLUMN attachment_id TYPE varchar(1000) USING attachment_id::text');
}
export async function down(knex) {
    await knex.raw('ALTER TABLE stage_activity_attachment ALTER COLUMN attachment_id TYPE uuid USING attachment_id::uuid');
}
