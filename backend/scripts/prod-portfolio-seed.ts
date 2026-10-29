import 'dotenv/config';
import knexFactory from 'knex';
import {
  NEW_USERS,
  REAL_PROJECTS,
  REAL_PROJECT_IDS,
  TEAM_ASSIGNMENTS,
  PEACE_JUNIOR_MILESTONES,
  EXISTING_USER_IDS as SEED_USER_IDS,
} from '../v1/seeds/17_real_portfolio_data.js';

/**
 * One-off reconciliation script — NOT a repeatable seed. Run once against
 * production to add the real portfolio on top of data that was already
 * hand-entered there (4 real user accounts, 1 real project: Gitanga Mall).
 *
 * Unlike 17_real_portfolio_data.ts (which assumes an empty/dev database),
 * this:
 *  - skips creating accounts for the 4 people who already have real
 *    @synergetic.co.ke accounts in prod, and remaps every reference to them
 *    onto their real user_id
 *  - creates the remaining 14 people under the @synergetic.co.ke convention
 *    already used in prod, not @gasconnectafrica.com
 *  - enriches the existing Gitanga Mall project row in place (by its real
 *    project_id/project_code) instead of inserting a duplicate, and never
 *    touches fields it already has real values for (dates, flags, etc.)
 *  - never touches project_stage for Gitanga Mall — its real stage state is
 *    already more nuanced (parallel active stages) than this seed's model
 *  - never inserts the fictional e2e-fixture accounts/roles (Admin/
 *    ProjectCreator/ExCo/PM/SiteEngineer test logins) — production already
 *    has a real Admin (you)
 */

const REQUIRED_ENV = ['PROD_DB_HOST', 'PROD_DB_PORT', 'PROD_DB_USER', 'PROD_DB_PASSWORD', 'PROD_DB_NAME'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) throw new Error(`Missing ${key} in environment`);
}

const db = knexFactory({
  client: 'pg',
  connection: {
    host: process.env.PROD_DB_HOST,
    port: Number(process.env.PROD_DB_PORT),
    user: process.env.PROD_DB_USER,
    password: process.env.PROD_DB_PASSWORD,
    database: process.env.PROD_DB_NAME,
    ssl: { rejectUnauthorized: false },
  },
});

// Real existing production user_ids for people the dev seed would otherwise duplicate.
const ID_REMAP: Record<string, string> = {
  [SEED_USER_IDS.BENEDETTE_MARIGI]: 'dd9726dc-4285-4671-92fe-bcbc0934f121', // bmarigi@synergetic.co.ke
  '12000000-0000-0000-0000-000000000001': '56f9e3de-195e-4c97-8145-fa9c4ba22c40', // David Mutua -> dmutua@
  '12000000-0000-0000-0000-000000000010': '55f867b4-fee5-40b3-8237-829171b050c0', // Arnold Onchere -> ochere@
  '12000000-0000-0000-0000-000000000005': '5e9d5eb3-a489-40cd-af71-705085192cdc', // Josphat Njuguna -> njuguna@
  [SEED_USER_IDS.PROJECT_CREATOR]: SEED_USER_IDS.ADMIN, // fictional ProjectCreator doesn't exist in prod; ADMIN's id *is* real (you)
};
const remap = (id: string) => ID_REMAP[id] ?? id;

// @synergetic.co.ke convention already used in prod (first-initial + surname), matching
// the 4 existing real accounts, instead of the dev seed's firstname.lastname@gasconnectafrica.com.
const PROD_EMAIL_OVERRIDES: Record<string, { email: string; username: string }> = {
  '12000000-0000-0000-0000-000000000002': { email: 'botieno@synergetic.co.ke', username: 'botieno' }, // Brian Otieno
  '12000000-0000-0000-0000-000000000003': { email: 'jmuriiki@synergetic.co.ke', username: 'jmuriiki' }, // Josline Muriiki
  '12000000-0000-0000-0000-000000000004': { email: 'jkiumbuki@synergetic.co.ke', username: 'jkiumbuki' }, // James Kiumbuki
  '12000000-0000-0000-0000-000000000006': { email: 'pkioko@synergetic.co.ke', username: 'pkioko' }, // Philip Kioko
  '12000000-0000-0000-0000-000000000007': { email: 'sotieno@synergetic.co.ke', username: 'sotieno' }, // Siama Otieno
  '12000000-0000-0000-0000-000000000008': { email: 'mkyalo@synergetic.co.ke', username: 'mkyalo' }, // Mutuku Kyalo
  '12000000-0000-0000-0000-000000000009': { email: 'mkatana@synergetic.co.ke', username: 'mkatana' }, // Moses Katana
  '12000000-0000-0000-0000-000000000011': { email: 'mketer@synergetic.co.ke', username: 'mketer' }, // Meshack Keter
  '12000000-0000-0000-0000-000000000012': { email: 'mchelangat@synergetic.co.ke', username: 'mchelangat' }, // Mercy Chelangat
  '12000000-0000-0000-0000-000000000013': { email: 'bkaniu@synergetic.co.ke', username: 'bkaniu' }, // Boniface Kaniu
  '12000000-0000-0000-0000-000000000014': { email: 'andungu@synergetic.co.ke', username: 'andungu' }, // Anthony Ndung'u
  '12000000-0000-0000-0000-000000000015': { email: 'dkimani@synergetic.co.ke', username: 'dkimani' }, // Daniel Kimani
  '12000000-0000-0000-0000-000000000016': { email: 'vanessa@synergetic.co.ke', username: 'vanessa' }, // Vanessa
  '12000000-0000-0000-0000-000000000017': { email: 'mutuma@synergetic.co.ke', username: 'mutuma' }, // Mutuma
};

const EXISTING_GITANGA_PROJECT_ID = 'dc6c22dd-ef40-42aa-8eac-633e526cc623';

async function main() {
  console.log(`Target: ${process.env.PROD_DB_HOST}/${process.env.PROD_DB_NAME} (production)`);

  await db.transaction(async (trx) => {
    // 1. New users — skip the 4 people who already have real prod accounts (excluded by
    // having an ID_REMAP entry), use the @synergetic.co.ke convention for the rest.
    const usersToInsert = NEW_USERS.filter((u) => !(u.id in ID_REMAP)).map((u) => {
      const override = PROD_EMAIL_OVERRIDES[u.id];
      if (!override) throw new Error(`No @synergetic.co.ke email mapped for new user ${u.id}`);
      return {
        id: u.id,
        external_id: null,
        first_name: u.first_name,
        last_name: u.last_name,
        email: override.email,
        username: override.username,
        phone_number: null, // matches existing real accounts' convention (none set yet)
        password_hash: process.env.SEED_PASSWORD_HASH_OVERRIDE ?? '$2a$10$maT1oyfF3COMDjifizq7r.hGdKcbOV4UljqVjCbu7/ob4t5Q9UB02',
        status: 'active',
        is_verified: false, // matches the 4 existing admin-created accounts, pending their first login
        updated_at: trx.fn.now(),
      };
    });

    if (usersToInsert.length !== 14) {
      throw new Error(`Expected 14 new users, got ${usersToInsert.length} — check ID_REMAP/overrides`);
    }

    await trx('users')
      .insert(usersToInsert)
      .onConflict('id')
      .merge({
        first_name: trx.raw('EXCLUDED.first_name'),
        last_name: trx.raw('EXCLUDED.last_name'),
        updated_at: trx.fn.now(),
      });

    // 2. Projects — enrich the existing Gitanga Mall row in place; insert the other 14.
    const gitanga = REAL_PROJECTS.find((p) => p.project_id === REAL_PROJECT_IDS.GITANGA_MALL)!;
    const otherProjects = REAL_PROJECTS.filter((p) => p.project_id !== REAL_PROJECT_IDS.GITANGA_MALL);

    // Only fill fields that are genuinely empty on the real row — never touch project_code,
    // name, client_name, site_location, dates, or scope flags, which are already correct
    // and in some cases (the dates) more current than this seed's.
    await trx('projects').where({ project_id: EXISTING_GITANGA_PROJECT_ID }).update({
      country: 'Kenya',
      estimated_value: gitanga.estimated_value,
      currency: gitanga.currency,
      updated_at: trx.fn.now(),
    });

    let holidayCalendarId: number | null = null;
    const calendarRow = await trx('holiday_calendar').select('calendar_id').where({ name: 'Kenya public holidays' }).first();
    if (calendarRow) holidayCalendarId = calendarRow.calendar_id;

    await trx('projects')
      .insert(
        otherProjects.map((p) => ({
          project_id: p.project_id,
          project_code: p.project_code,
          name: p.name,
          program_id: p.program_id,
          client_name: p.client_name,
          country: 'Kenya',
          site_location: p.site_location,
          site_lat: p.site_lat,
          site_lng: p.site_lng,
          timezone: 'Africa/Nairobi',
          is_civil: p.is_civil ?? false,
          is_mechanical: p.is_mechanical ?? true,
          is_electrical: p.is_electrical ?? false,
          expected_start_date: p.expected_start_date,
          expected_end_date: p.expected_end_date,
          estimated_value: p.estimated_value,
          currency: p.currency,
          status: p.status,
          holiday_calendar_id: holidayCalendarId,
          dpr_expected_weekdays: trx.raw(`'{1,2,3,4,5,6}'::smallint[]`),
          created_by: remap(SEED_USER_IDS.ADMIN),
          updated_at: trx.fn.now(),
        })),
      )
      .onConflict('project_id')
      .merge({ updated_at: trx.fn.now() });

    // 3. Project status history — only Kerarapon (on_hold) needs one; Gitanga is untouched.
    const transitioned = otherProjects.filter((p) => p.status !== 'active');
    if (transitioned.length > 0) {
      await trx('project_status_history')
        .insert(
          transitioned.map((p, i) => ({
            history_id: `36000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
            project_id: p.project_id,
            from_status: 'active',
            to_status: p.status,
            reason: p.on_hold_reason ?? null,
            actor_id: remap(SEED_USER_IDS.ADMIN),
            changed_at: trx.fn.now(),
          })),
        )
        .onConflict('history_id')
        .merge({ to_status: trx.raw('EXCLUDED.to_status'), changed_at: trx.fn.now() });
    }

    // 4. Roles — remap existing-person ids; skip nothing here since additional grants
    // (e.g. Arnold Onchere also getting Planner alongside his existing real PM grant) are
    // additive, never a removal of what's already there.
    await trx('roles')
      .insert(
        TEAM_ASSIGNMENTS.map((t, i) => ({
          attribute_id: `37000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
          user_id: remap(t.user_id),
          role: t.role,
          scope_type: 'project',
          program_id: null,
          project_id: t.project_id === REAL_PROJECT_IDS.GITANGA_MALL ? EXISTING_GITANGA_PROJECT_ID : t.project_id,
          granted_by: remap(SEED_USER_IDS.ADMIN),
          granted_at: trx.fn.now(),
        })),
      )
      .onConflict('attribute_id')
      .merge({ revoked_at: null, revoked_by: null, revoke_reason: null });

    // 5. Project team members — the table was genuinely empty for Gitanga Mall (roles had
    // been granted directly, nobody added as a formal team member yet), so populating the
    // full team there is a pure gap-fill, not an overwrite of anything real.
    await trx('project_team_members')
      .insert(
        TEAM_ASSIGNMENTS.map((t) => ({
          project_id: t.project_id === REAL_PROJECT_IDS.GITANGA_MALL ? EXISTING_GITANGA_PROJECT_ID : t.project_id,
          user_id: remap(t.user_id),
          is_team_lead: t.is_team_lead,
          added_at: trx.fn.now(),
        })),
      )
      .onConflict(['project_id', 'user_id'])
      .merge({ is_team_lead: trx.raw('EXCLUDED.is_team_lead') });

    // 6. Project stages — skip Gitanga Mall entirely (real stage state already set, and
    // more nuanced than this seed's simple model); insert for the other 14.
    const stageRows: Array<Record<string, unknown>> = [];
    for (const p of otherProjects) {
      const scopeUpTo = Math.max(p.current_stage_no, 8);
      for (let s = 1; s <= 10; s++) {
        let state: 'not_started' | 'active' | 'inactive' | 'complete' = 'not_started';
        if (s < p.current_stage_no) state = 'complete';
        else if (s === p.current_stage_no) state = p.status === 'complete' ? 'complete' : 'active';

        stageRows.push({
          project_id: p.project_id,
          stage_no: s,
          in_scope: s <= scopeUpTo,
          state,
          added_to_scope_by: remap(SEED_USER_IDS.ADMIN),
          added_to_scope_at: trx.fn.now(),
          last_changed_by: remap(p.team_lead_id),
          last_changed_at: trx.fn.now(),
        });
      }
    }
    await trx('project_stage')
      .insert(stageRows)
      .onConflict(['project_id', 'stage_no'])
      .merge({ in_scope: trx.raw('EXCLUDED.in_scope'), state: trx.raw('EXCLUDED.state'), last_changed_at: trx.fn.now() });

    // 7. Peace Junior's 3-day install milestones (new project, no conflict).
    await trx('custom_milestones')
      .insert(
        PEACE_JUNIOR_MILESTONES.map((m) => ({
          milestone_id: m.milestone_id,
          project_id: REAL_PROJECT_IDS.PEACE_JUNIOR,
          stage_no: 6,
          title: m.title,
          planned_date: m.planned_date,
          created_by: remap(SEED_USER_IDS.BENEDETTE_MARIGI),
          updated_by: remap(SEED_USER_IDS.BENEDETTE_MARIGI),
        })),
      )
      .onConflict('milestone_id')
      .merge({ title: trx.raw('EXCLUDED.title'), planned_date: trx.raw('EXCLUDED.planned_date') });
  });

  console.log('Done.');
  await db.destroy();
}

main().catch(async (err) => {
  console.error('FAILED, transaction rolled back:', err);
  await db.destroy();
  process.exit(1);
});
