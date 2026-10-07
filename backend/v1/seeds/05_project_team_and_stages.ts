import type { Knex } from 'knex';

export const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
  SITE_ENGINEER_2: '10000000-0000-0000-0000-000000000008',
};

export const PROJECT_IDS = {
  PROJECT_1: '20000000-0000-0000-0000-000000000001',
  PROJECT_2: '20000000-0000-0000-0000-000000000002',
  PROJECT_3: '20000000-0000-0000-0000-000000000003',
};

export async function seed(knex: Knex): Promise<void> {
  // 1. Seed Project Team Members
  const teamMembers = [
    // Project 1
    {
      project_id: PROJECT_IDS.PROJECT_1,
      user_id: USER_IDS.PM,
      is_team_lead: true,
      added_at: knex.fn.now(),
    },
    {
      project_id: PROJECT_IDS.PROJECT_1,
      user_id: USER_IDS.PLANNER,
      is_team_lead: false,
      added_at: knex.fn.now(),
    },
    {
      project_id: PROJECT_IDS.PROJECT_1,
      user_id: USER_IDS.SITE_ENGINEER,
      is_team_lead: false,
      added_at: knex.fn.now(),
    },

    // Project 2
    {
      project_id: PROJECT_IDS.PROJECT_2,
      user_id: USER_IDS.PM,
      is_team_lead: true,
      added_at: knex.fn.now(),
    },
    {
      project_id: PROJECT_IDS.PROJECT_2,
      user_id: USER_IDS.PLANNER,
      is_team_lead: false,
      added_at: knex.fn.now(),
    },
    {
      project_id: PROJECT_IDS.PROJECT_2,
      user_id: USER_IDS.SITE_ENGINEER_2,
      is_team_lead: false,
      added_at: knex.fn.now(),
    },

    // Project 3
    {
      project_id: PROJECT_IDS.PROJECT_3,
      user_id: USER_IDS.PM_2,
      is_team_lead: true,
      added_at: knex.fn.now(),
    },
    {
      project_id: PROJECT_IDS.PROJECT_3,
      user_id: USER_IDS.PLANNER,
      is_team_lead: false,
      added_at: knex.fn.now(),
    },
    {
      project_id: PROJECT_IDS.PROJECT_3,
      user_id: USER_IDS.SITE_ENGINEER,
      is_team_lead: false,
      added_at: knex.fn.now(),
    },
  ];

  if (await knex.schema.hasTable('project_team_members')) {
    await knex('project_team_members')
      .insert(teamMembers)
      .onConflict(['project_id', 'user_id'])
      .merge({
        is_team_lead: knex.raw('EXCLUDED.is_team_lead'),
      });
  }

  // 2. Seed Client Contacts
  const clientContacts = [
    {
      contact_id: '40000000-0000-0000-0000-000000000001',
      project_id: PROJECT_IDS.PROJECT_1,
      name: 'Eng. David Kariuki',
      email: 'd.kariuki@kpc.co.ke',
      title: 'Chief Infrastructure Officer',
      receives_reports: true,
    },
    {
      contact_id: '40000000-0000-0000-0000-000000000002',
      project_id: PROJECT_IDS.PROJECT_2,
      name: 'Mary Wambui',
      email: 'm.wambui@energy.go.ke',
      title: 'Director of Petroleum & Gas',
      receives_reports: true,
    },
    {
      contact_id: '40000000-0000-0000-0000-000000000003',
      project_id: PROJECT_IDS.PROJECT_3,
      name: 'John Mworia',
      email: 'john.mworia@totalenergies.ke',
      title: 'Operations Director',
      receives_reports: true,
    },
  ];

  if (await knex.schema.hasTable('client_contacts')) {
    await knex('client_contacts')
      .insert(clientContacts)
      .onConflict('contact_id')
      .merge({
        name: knex.raw('EXCLUDED.name'),
        email: knex.raw('EXCLUDED.email'),
        title: knex.raw('EXCLUDED.title'),
        receives_reports: knex.raw('EXCLUDED.receives_reports'),
      });
  }

  // 3. Seed Project Stages (pdm_stage 1..10)
  if (await knex.schema.hasTable('project_stage')) {
    const projectStageRows: Array<{
      project_id: string;
      stage_no: number;
      in_scope: boolean;
      state: 'not_started' | 'active' | 'inactive' | 'complete';
      added_to_scope_by: string;
      added_to_scope_at: any;
      last_changed_by: string;
      last_changed_at: any;
    }> = [];

    // Project 1: Construction stage active
    for (let s = 1; s <= 10; s++) {
      let state: 'not_started' | 'active' | 'inactive' | 'complete' = 'not_started';
      const in_scope = s <= 8;
      if (s < 7) state = 'complete';
      else if (s === 7) state = 'active';

      projectStageRows.push({
        project_id: PROJECT_IDS.PROJECT_1,
        stage_no: s,
        in_scope,
        state,
        added_to_scope_by: USER_IDS.PROJECT_CREATOR,
        added_to_scope_at: knex.fn.now(),
        last_changed_by: USER_IDS.PM,
        last_changed_at: knex.fn.now(),
      });
    }

    // Project 2: PMC & Design active
    for (let s = 1; s <= 10; s++) {
      let state: 'not_started' | 'active' | 'inactive' | 'complete' = 'not_started';
      const in_scope = s <= 8;
      if (s < 4) state = 'complete';
      else if (s === 4) state = 'active';

      projectStageRows.push({
        project_id: PROJECT_IDS.PROJECT_2,
        stage_no: s,
        in_scope,
        state,
        added_to_scope_by: USER_IDS.PROJECT_CREATOR,
        added_to_scope_at: knex.fn.now(),
        last_changed_by: USER_IDS.PM,
        last_changed_at: knex.fn.now(),
      });
    }

    // Project 3: Structuring & Financing active
    for (let s = 1; s <= 10; s++) {
      let state: 'not_started' | 'active' | 'inactive' | 'complete' = 'not_started';
      const in_scope = s <= 8;
      if (s < 3) state = 'complete';
      else if (s === 3) state = 'active';

      projectStageRows.push({
        project_id: PROJECT_IDS.PROJECT_3,
        stage_no: s,
        in_scope,
        state,
        added_to_scope_by: USER_IDS.ADMIN,
        added_to_scope_at: knex.fn.now(),
        last_changed_by: USER_IDS.PM_2,
        last_changed_at: knex.fn.now(),
      });
    }

    await knex('project_stage')
      .insert(projectStageRows)
      .onConflict(['project_id', 'stage_no'])
      .merge({
        in_scope: knex.raw('EXCLUDED.in_scope'),
        state: knex.raw('EXCLUDED.state'),
        last_changed_by: knex.raw('EXCLUDED.last_changed_by'),
        last_changed_at: knex.fn.now(),
      });
  }
}
