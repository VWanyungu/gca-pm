import type { Knex } from 'knex';

/**
 * The FYI state is gone from the product: a Site Engineer's change request is no longer a
 * note for the PM, it is approved like any other. Existing 'noted' rows become 'approved' so
 * nothing in the register still displays a status the app no longer has.
 *
 * The enum value itself stays — dropping one means recreating the type, and an unused value
 * costs nothing.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    UPDATE change_request
    SET status = 'approved', decided_at = COALESCE(decided_at, raised_at)
    WHERE status = 'noted'
  `);
}

export async function down(): Promise<void> {
  // Which approved rows were once 'noted' is not recorded, so this cannot be reversed.
}
