import type { Knex } from 'knex';

// Real project data from:
//  - Project Tracker GCL.xlsx (15 live projects, as of tracker update 2026-10-28)
//  - Project Brief: Gitanga Mall LPG Reticulation Project (28 Aug 2026 kickoff)
//  - Peace Junior School LPG Kitchen Project — client kick-off deck
//
// Known gaps left NULL rather than invented: project_code for 6 projects
// (tracker shows "-"), site_location/estimated_value/dates for every project
// except Gitanga Mall and Peace Junior, and budget/actual-spent/SPI/CPI/
// billing-milestone figures for Gitanga Mall (no columns exist for these on
// `projects` — only estimated_value/currency do).

// Mirrors of ids from 01_users.ts / 02_programs.ts / 04_roles.ts (inlined —
// knex ESM seeds don't cross-import cleanly here).
const SEED_PASSWORD_HASH =
  '$2a$10$maT1oyfF3COMDjifizq7r.hGdKcbOV4UljqVjCbu7/ob4t5Q9UB02';

const EXISTING_USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PROJECT_CREATOR: '10000000-0000-0000-0000-000000000002',
  BENEDETTE_MARIGI: '10000000-0000-0000-0000-000000000005',
  // e2e role-access fixtures (e2e/fixtures.ts) — not real project staff, kept
  // here only so the "pm"/"engineer" test logins still hold a genuine
  // project-scoped grant now that the fake demo projects are gone.
  E2E_PM: '10000000-0000-0000-0000-000000000004',
  E2E_SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
};

const PROGRAM_IDS = {
  OPEN_ACCESS_BOTTLING_PLANT: 2,
  AUTOGAS: 3,
  RETICULATION: 4,
  INDUSTRIAL_AND_CONSTRUCTION: 5,
  VULCAN: 7,
};

// New real people named in the tracker/briefs who don't exist as users yet.
export const NEW_USER_IDS = {
  DAVID_MUTUA: '12000000-0000-0000-0000-000000000001',
  BRIAN_OTIENO: '12000000-0000-0000-0000-000000000002',
  JOSLINE_MURIIKI: '12000000-0000-0000-0000-000000000003',
  JAMES_KIUMBUKI: '12000000-0000-0000-0000-000000000004',
  JOSPHAT_NJUGUNA: '12000000-0000-0000-0000-000000000005',
  PHILIP_KIOKO: '12000000-0000-0000-0000-000000000006',
  SIAMA_OTIENO: '12000000-0000-0000-0000-000000000007',
  MUTUKU_KYALO: '12000000-0000-0000-0000-000000000008',
  MOSES_KATANA: '12000000-0000-0000-0000-000000000009',
  ARNOLD_ONCHERE: '12000000-0000-0000-0000-000000000010',
  MESHACK_KETER: '12000000-0000-0000-0000-000000000011',
  MERCY_CHELANGAT: '12000000-0000-0000-0000-000000000012',
  BONIFACE_KANIU: '12000000-0000-0000-0000-000000000013',
  ANTHONY_NDUNGU: '12000000-0000-0000-0000-000000000014',
  DANIEL_KIMANI: '12000000-0000-0000-0000-000000000015',
  VANESSA: '12000000-0000-0000-0000-000000000016', // surname not given in source docs
  MUTUMA: '12000000-0000-0000-0000-000000000017', // surname not given in source docs
};

const NEW_USERS: Array<{
  id: string;
  external_id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  username: string;
  phone_number: string;
}> = [
  { id: NEW_USER_IDS.DAVID_MUTUA, external_id: 'USR-0009', first_name: 'David', last_name: 'Mutua', email: 'david.mutua@gasconnectafrica.com', username: 'david.mutua', phone_number: '+254700000009' },
  { id: NEW_USER_IDS.BRIAN_OTIENO, external_id: 'USR-0010', first_name: 'Brian', last_name: 'Otieno', email: 'brian.otieno@gasconnectafrica.com', username: 'brian.otieno', phone_number: '+254700000010' },
  { id: NEW_USER_IDS.JOSLINE_MURIIKI, external_id: 'USR-0011', first_name: 'Josline', last_name: 'Muriiki', email: 'josline.muriiki@gasconnectafrica.com', username: 'josline.muriiki', phone_number: '+254700000011' },
  { id: NEW_USER_IDS.JAMES_KIUMBUKI, external_id: 'USR-0012', first_name: 'James', last_name: 'Kiumbuki', email: 'james.kiumbuki@gasconnectafrica.com', username: 'james.kiumbuki', phone_number: '+254700000012' },
  { id: NEW_USER_IDS.JOSPHAT_NJUGUNA, external_id: 'USR-0013', first_name: 'Josphat', last_name: 'Njuguna', email: 'josphat.njuguna@gasconnectafrica.com', username: 'josphat.njuguna', phone_number: '+254700000013' },
  { id: NEW_USER_IDS.PHILIP_KIOKO, external_id: 'USR-0014', first_name: 'Philip', last_name: 'Kioko', email: 'philip.kioko@gasconnectafrica.com', username: 'philip.kioko', phone_number: '+254700000014' },
  { id: NEW_USER_IDS.SIAMA_OTIENO, external_id: 'USR-0015', first_name: 'Siama', last_name: 'Otieno', email: 'siama.otieno@gasconnectafrica.com', username: 'siama.otieno', phone_number: '+254700000015' },
  { id: NEW_USER_IDS.MUTUKU_KYALO, external_id: 'USR-0016', first_name: 'Mutuku', last_name: 'Kyalo', email: 'mutuku.kyalo@gasconnectafrica.com', username: 'mutuku.kyalo', phone_number: '+254700000016' },
  { id: NEW_USER_IDS.MOSES_KATANA, external_id: 'USR-0017', first_name: 'Moses', last_name: 'Katana', email: 'moses.katana@gasconnectafrica.com', username: 'moses.katana', phone_number: '+254700000017' },
  { id: NEW_USER_IDS.ARNOLD_ONCHERE, external_id: 'USR-0018', first_name: 'Arnold', last_name: 'Onchere', email: 'arnold.onchere@gasconnectafrica.com', username: 'arnold.onchere', phone_number: '+254700000018' },
  { id: NEW_USER_IDS.MESHACK_KETER, external_id: 'USR-0019', first_name: 'Meshack', last_name: 'Keter', email: 'meshack.keter@gasconnectafrica.com', username: 'meshack.keter', phone_number: '+254700000019' },
  { id: NEW_USER_IDS.MERCY_CHELANGAT, external_id: 'USR-0020', first_name: 'Mercy', last_name: 'Chelangat', email: 'mercy.chelangat@gasconnectafrica.com', username: 'mercy.chelangat', phone_number: '+254700000020' },
  { id: NEW_USER_IDS.BONIFACE_KANIU, external_id: 'USR-0021', first_name: 'Boniface', last_name: 'Kaniu', email: 'boniface.kaniu@gasconnectafrica.com', username: 'boniface.kaniu', phone_number: '+254700000021' },
  { id: NEW_USER_IDS.ANTHONY_NDUNGU, external_id: 'USR-0022', first_name: "Anthony", last_name: "Ndung'u", email: 'anthony.ndungu@gasconnectafrica.com', username: 'anthony.ndungu', phone_number: '+254700000022' },
  { id: NEW_USER_IDS.DANIEL_KIMANI, external_id: 'USR-0023', first_name: 'Daniel', last_name: 'Kimani', email: 'daniel.kimani@gasconnectafrica.com', username: 'daniel.kimani', phone_number: '+254700000023' },
  { id: NEW_USER_IDS.VANESSA, external_id: 'USR-0024', first_name: 'Vanessa', last_name: '', email: 'vanessa@gasconnectafrica.com', username: 'vanessa', phone_number: '+254700000024' },
  { id: NEW_USER_IDS.MUTUMA, external_id: 'USR-0025', first_name: 'Mutuma', last_name: '', email: 'mutuma@gasconnectafrica.com', username: 'mutuma', phone_number: '+254700000025' },
];

export const REAL_PROJECT_IDS = {
  DOMINICAN_NUNS: '21000000-0000-0000-0000-000000000001',
  MISTER_BAKERS: '21000000-0000-0000-0000-000000000002',
  UTAWALA_AUTOGAS: '21000000-0000-0000-0000-000000000003',
  TWISTER_BAKERS: '21000000-0000-0000-0000-000000000004',
  GITANGA_MALL: '21000000-0000-0000-0000-000000000005',
  KOFUROW: '21000000-0000-0000-0000-000000000006',
  VULCAN_STRATEGIC_HUB: '21000000-0000-0000-0000-000000000007',
  KERARAPON_AUTOGAS: '21000000-0000-0000-0000-000000000008',
  HEWATELE_MEP: '21000000-0000-0000-0000-000000000009',
  PEACE_JUNIOR: '21000000-0000-0000-0000-000000000010',
  KAKUMA: '21000000-0000-0000-0000-000000000011',
  KERICHO: '21000000-0000-0000-0000-000000000012',
  NAKURU: '21000000-0000-0000-0000-000000000013',
  PEK: '21000000-0000-0000-0000-000000000014',
  GZI: '21000000-0000-0000-0000-000000000015',
};

type ProjectStatus = 'active' | 'on_hold' | 'complete' | 'cancelled';

interface RealProject {
  project_id: string;
  project_code: string;
  code_is_placeholder: boolean; // tracker had "-"; flagged for ops to replace with the real code
  name: string;
  program_id: number;
  client_name: string;
  site_location: string | null;
  site_lat: number | null;
  site_lng: number | null;
  is_civil?: boolean;
  is_mechanical?: boolean;
  is_electrical?: boolean;
  expected_start_date: string | null;
  expected_end_date: string | null;
  estimated_value: number | null;
  currency: string | null;
  status: ProjectStatus;
  current_stage_no: number; // drives project_stage rows below
  team_lead_id: string;
  on_hold_reason?: string;
}

const REAL_PROJECTS: RealProject[] = [
  {
    project_id: REAL_PROJECT_IDS.DOMINICAN_NUNS,
    project_code: '900-001.2026', code_is_placeholder: true,
    name: 'Dominican Nuns', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Dominican Nuns', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 7, team_lead_id: NEW_USER_IDS.DAVID_MUTUA,
  },
  {
    project_id: REAL_PROJECT_IDS.MISTER_BAKERS,
    project_code: '900-002.2026', code_is_placeholder: true,
    name: 'Mister Bakers', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Mister Bakers', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'complete', current_stage_no: 8, team_lead_id: NEW_USER_IDS.DAVID_MUTUA,
  },
  {
    project_id: REAL_PROJECT_IDS.UTAWALA_AUTOGAS,
    project_code: '335-002.2026', code_is_placeholder: false,
    name: 'Utawala Autogas Station', program_id: PROGRAM_IDS.AUTOGAS,
    client_name: 'Utawala Autogas Station', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 1, team_lead_id: NEW_USER_IDS.DAVID_MUTUA,
  },
  {
    project_id: REAL_PROJECT_IDS.TWISTER_BAKERS,
    project_code: '900-003.2026', code_is_placeholder: true,
    name: 'Twister Bakers', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Twister Bakers', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 7, team_lead_id: NEW_USER_IDS.DAVID_MUTUA,
  },
  {
    // Tracker's "Owner" column says David Mutua (likely the Reticulation program
    // owner generally), but the project-specific brief names Benedette Marigi as
    // "Project lead and overall project manager" — trusting the project-specific
    // document over the tracker's generic column for who holds team lead here.
    project_id: REAL_PROJECT_IDS.GITANGA_MALL,
    project_code: '354-001.2026', code_is_placeholder: false,
    name: 'Gitanga Mall LPG Reticulation Project', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Gitanga Mall Development Team',
    site_location: 'Junction of Gitanga Road and James Gichuru Road, Nairobi',
    site_lat: null, site_lng: null,
    is_civil: true, is_mechanical: true, is_electrical: true,
    expected_start_date: '2026-08-24', expected_end_date: '2026-10-30',
    estimated_value: 11125710.70, currency: 'KES',
    status: 'active', current_stage_no: 7, team_lead_id: EXISTING_USER_IDS.BENEDETTE_MARIGI,
  },
  {
    project_id: REAL_PROJECT_IDS.KOFUROW,
    project_code: '900-004.2026', code_is_placeholder: true,
    name: 'Kofurow', program_id: PROGRAM_IDS.OPEN_ACCESS_BOTTLING_PLANT,
    client_name: 'Kofurow', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 1, team_lead_id: NEW_USER_IDS.JOSLINE_MURIIKI,
  },
  {
    project_id: REAL_PROJECT_IDS.VULCAN_STRATEGIC_HUB,
    project_code: '335-001.2025', code_is_placeholder: false,
    name: 'Vulcan Strategic Hub', program_id: PROGRAM_IDS.VULCAN,
    client_name: 'Vulcan Strategic Hub', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 2, team_lead_id: NEW_USER_IDS.BRIAN_OTIENO,
  },
  {
    // Tracker's Status column literally reads "On hold" even though the
    // Completion column still says "In Progress" — trusting the more specific
    // status note.
    project_id: REAL_PROJECT_IDS.KERARAPON_AUTOGAS,
    project_code: '099-003.2026', code_is_placeholder: false,
    name: 'Kerarapon Autogas Stations', program_id: PROGRAM_IDS.AUTOGAS,
    client_name: 'Kerarapon Autogas Stations', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'on_hold', current_stage_no: 1, team_lead_id: NEW_USER_IDS.DAVID_MUTUA,
    on_hold_reason: 'On hold per project tracker, pending approvals',
  },
  {
    project_id: REAL_PROJECT_IDS.HEWATELE_MEP,
    project_code: '233-001.2024', code_is_placeholder: false,
    name: 'Hewatele MEP Works', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Hewatele MEP Works', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'complete', current_stage_no: 7, team_lead_id: EXISTING_USER_IDS.BENEDETTE_MARIGI,
  },
  {
    // Same lead-override rationale as Gitanga Mall: the kick-off deck names
    // Benedette as "Project lead and overall project manager"; David Mutua
    // (tracker Owner) keeps a PM role on the project without the lead flag.
    project_id: REAL_PROJECT_IDS.PEACE_JUNIOR,
    project_code: '330-002.2026', code_is_placeholder: false,
    name: 'Peace Junior School LPG Kitchen Project', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Peace Junior School', site_location: null, site_lat: null, site_lng: null,
    is_mechanical: true, is_electrical: true,
    // Deck gives no calendar date, only "Saturday, 3-day install"; inferred as
    // the next Saturday after the tracker's last update (2026-10-27) — confirm with ops.
    expected_start_date: '2026-10-31', expected_end_date: '2026-11-02',
    estimated_value: null, currency: null,
    status: 'active', current_stage_no: 6, team_lead_id: EXISTING_USER_IDS.BENEDETTE_MARIGI,
  },
  {
    project_id: REAL_PROJECT_IDS.KAKUMA,
    project_code: '900-005.2026', code_is_placeholder: true,
    name: 'Kakuma', program_id: PROGRAM_IDS.OPEN_ACCESS_BOTTLING_PLANT,
    client_name: 'Kakuma', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 7, team_lead_id: NEW_USER_IDS.JAMES_KIUMBUKI,
  },
  {
    project_id: REAL_PROJECT_IDS.KERICHO,
    project_code: '149-001.2023', code_is_placeholder: false,
    name: 'Kericho', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Kericho', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 7, team_lead_id: NEW_USER_IDS.BRIAN_OTIENO,
  },
  {
    project_id: REAL_PROJECT_IDS.NAKURU,
    project_code: '341-001.2025', code_is_placeholder: false,
    name: 'Nakuru', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'Nakuru', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 7, team_lead_id: NEW_USER_IDS.BRIAN_OTIENO,
  },
  {
    project_id: REAL_PROJECT_IDS.PEK,
    project_code: '900-006.2026', code_is_placeholder: true,
    name: 'PEK', program_id: PROGRAM_IDS.RETICULATION,
    client_name: 'PEK', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'active', current_stage_no: 7, team_lead_id: NEW_USER_IDS.DAVID_MUTUA,
  },
  {
    project_id: REAL_PROJECT_IDS.GZI,
    project_code: '245-003.2025', code_is_placeholder: false,
    name: 'GZI', program_id: PROGRAM_IDS.INDUSTRIAL_AND_CONSTRUCTION,
    client_name: 'GZI', site_location: null, site_lat: null, site_lng: null,
    expected_start_date: null, expected_end_date: null, estimated_value: null, currency: null,
    status: 'complete', current_stage_no: 9, team_lead_id: EXISTING_USER_IDS.BENEDETTE_MARIGI,
  },
];

type Role = 'PM' | 'Planner' | 'SiteEngineer' | 'ExCo' | 'Admin' | 'ProjectCreator';

interface TeamAssignment {
  project_id: string;
  user_id: string;
  role: Role;
  is_team_lead: boolean;
}

const TEAM_ASSIGNMENTS: TeamAssignment[] = [
  // Dominican Nuns
  { project_id: REAL_PROJECT_IDS.DOMINICAN_NUNS, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.DOMINICAN_NUNS, user_id: NEW_USER_IDS.JOSPHAT_NJUGUNA, role: 'SiteEngineer', is_team_lead: false },
  { project_id: REAL_PROJECT_IDS.DOMINICAN_NUNS, user_id: NEW_USER_IDS.PHILIP_KIOKO, role: 'SiteEngineer', is_team_lead: false },
  // Mister Bakers
  { project_id: REAL_PROJECT_IDS.MISTER_BAKERS, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.MISTER_BAKERS, user_id: NEW_USER_IDS.MOSES_KATANA, role: 'SiteEngineer', is_team_lead: false },
  // Utawala Autogas Station
  { project_id: REAL_PROJECT_IDS.UTAWALA_AUTOGAS, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.UTAWALA_AUTOGAS, user_id: NEW_USER_IDS.SIAMA_OTIENO, role: 'SiteEngineer', is_team_lead: false },
  // Twister Bakers
  { project_id: REAL_PROJECT_IDS.TWISTER_BAKERS, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.TWISTER_BAKERS, user_id: NEW_USER_IDS.PHILIP_KIOKO, role: 'SiteEngineer', is_team_lead: false },
  // Gitanga Mall (brief's named project team, plus tracker's responsible persons)
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: EXISTING_USER_IDS.BENEDETTE_MARIGI, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: false },
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.ARNOLD_ONCHERE, role: 'Planner', is_team_lead: false }, // Design & Regulatory (EPRA)
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.JOSPHAT_NJUGUNA, role: 'SiteEngineer', is_team_lead: false }, // Mechanical Procurement
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.MESHACK_KETER, role: 'SiteEngineer', is_team_lead: false }, // Electrical Support
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.MERCY_CHELANGAT, role: 'SiteEngineer', is_team_lead: false }, // Electrical Support
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.BONIFACE_KANIU, role: 'SiteEngineer', is_team_lead: false }, // Finance
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.DANIEL_KIMANI, role: 'SiteEngineer', is_team_lead: false }, // Construction Execution
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.ANTHONY_NDUNGU, role: 'SiteEngineer', is_team_lead: false }, // HSE Support
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.MUTUKU_KYALO, role: 'SiteEngineer', is_team_lead: false }, // tracker: construction responsible
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.MOSES_KATANA, role: 'SiteEngineer', is_team_lead: false }, // tracker: construction responsible
  { project_id: REAL_PROJECT_IDS.GITANGA_MALL, user_id: NEW_USER_IDS.MUTUMA, role: 'SiteEngineer', is_team_lead: false }, // tracker: construction responsible
  // Kofurow
  { project_id: REAL_PROJECT_IDS.KOFUROW, user_id: NEW_USER_IDS.JOSLINE_MURIIKI, role: 'PM', is_team_lead: true },
  // Vulcan Strategic Hub
  { project_id: REAL_PROJECT_IDS.VULCAN_STRATEGIC_HUB, user_id: NEW_USER_IDS.BRIAN_OTIENO, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.VULCAN_STRATEGIC_HUB, user_id: EXISTING_USER_IDS.BENEDETTE_MARIGI, role: 'Planner', is_team_lead: false },
  // Kerarapon Autogas Stations
  { project_id: REAL_PROJECT_IDS.KERARAPON_AUTOGAS, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.KERARAPON_AUTOGAS, user_id: EXISTING_USER_IDS.BENEDETTE_MARIGI, role: 'Planner', is_team_lead: false },
  // Hewatele MEP Works
  { project_id: REAL_PROJECT_IDS.HEWATELE_MEP, user_id: EXISTING_USER_IDS.BENEDETTE_MARIGI, role: 'PM', is_team_lead: true },
  // Peace Junior School
  { project_id: REAL_PROJECT_IDS.PEACE_JUNIOR, user_id: EXISTING_USER_IDS.BENEDETTE_MARIGI, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.PEACE_JUNIOR, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: false },
  { project_id: REAL_PROJECT_IDS.PEACE_JUNIOR, user_id: NEW_USER_IDS.PHILIP_KIOKO, role: 'SiteEngineer', is_team_lead: false }, // execution lead
  { project_id: REAL_PROJECT_IDS.PEACE_JUNIOR, user_id: NEW_USER_IDS.DANIEL_KIMANI, role: 'SiteEngineer', is_team_lead: false }, // electrical engineer
  { project_id: REAL_PROJECT_IDS.PEACE_JUNIOR, user_id: NEW_USER_IDS.ARNOLD_ONCHERE, role: 'SiteEngineer', is_team_lead: false }, // mechanical engineer
  { project_id: REAL_PROJECT_IDS.PEACE_JUNIOR, user_id: NEW_USER_IDS.VANESSA, role: 'SiteEngineer', is_team_lead: false }, // quality control
  // Kakuma
  { project_id: REAL_PROJECT_IDS.KAKUMA, user_id: NEW_USER_IDS.JAMES_KIUMBUKI, role: 'PM', is_team_lead: true },
  // Kericho
  { project_id: REAL_PROJECT_IDS.KERICHO, user_id: NEW_USER_IDS.BRIAN_OTIENO, role: 'PM', is_team_lead: true },
  // Nakuru
  { project_id: REAL_PROJECT_IDS.NAKURU, user_id: NEW_USER_IDS.BRIAN_OTIENO, role: 'PM', is_team_lead: true },
  // PEK
  { project_id: REAL_PROJECT_IDS.PEK, user_id: NEW_USER_IDS.DAVID_MUTUA, role: 'PM', is_team_lead: true },
  { project_id: REAL_PROJECT_IDS.PEK, user_id: NEW_USER_IDS.PHILIP_KIOKO, role: 'SiteEngineer', is_team_lead: false },
  // GZI
  { project_id: REAL_PROJECT_IDS.GZI, user_id: EXISTING_USER_IDS.BENEDETTE_MARIGI, role: 'PM', is_team_lead: true },
];

// Peace Junior's 3-day install plan from the kick-off deck is the only source
// document with a concrete, dated schedule beyond a single current stage, so
// it's the only project seeded with custom_milestones here.
const PEACE_JUNIOR_MILESTONES = [
  { milestone_id: '67000000-0000-0000-0000-000000000001', title: 'Day 1 — Site set-up: induction, work-area prep, cylinder-area setup, route marking', planned_date: '2026-10-31' },
  { milestone_id: '67000000-0000-0000-0000-000000000002', title: 'Day 2 — Install & connect: piping reticulation, regulators, safety components, kitchen connections', planned_date: '2026-11-01' },
  { milestone_id: '67000000-0000-0000-0000-000000000003', title: 'Day 3 — Test & handover: pressure/leak testing, commissioning, user orientation', planned_date: '2026-11-02' },
];

export async function seed(knex: Knex): Promise<void> {
  // 1. Users
  await knex('users')
    .insert(
      NEW_USERS.map((u) => ({
        ...u,
        password_hash: SEED_PASSWORD_HASH,
        status: 'active',
        is_verified: true,
        updated_at: knex.fn.now(),
      })),
    )
    .onConflict('id')
    .merge({
      external_id: knex.raw('EXCLUDED.external_id'),
      first_name: knex.raw('EXCLUDED.first_name'),
      last_name: knex.raw('EXCLUDED.last_name'),
      email: knex.raw('EXCLUDED.email'),
      password_hash: knex.raw('EXCLUDED.password_hash'),
      phone_number: knex.raw('EXCLUDED.phone_number'),
      status: knex.raw('EXCLUDED.status'),
      username: knex.raw('EXCLUDED.username'),
      is_verified: knex.raw('EXCLUDED.is_verified'),
      updated_at: knex.fn.now(),
    });

  // 2. Projects
  let holidayCalendarId: number | null = null;
  if (await knex.schema.hasTable('holiday_calendar')) {
    const calendarRow = await knex('holiday_calendar')
      .select('calendar_id')
      .where({ name: 'Kenya public holidays' })
      .first();
    if (calendarRow) holidayCalendarId = calendarRow.calendar_id;
  }

  await knex('projects')
    .insert(
      REAL_PROJECTS.map((p) => ({
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
        dpr_expected_weekdays: knex.raw(`'{1,2,3,4,5,6}'::smallint[]`),
        created_by: EXISTING_USER_IDS.PROJECT_CREATOR,
        updated_at: knex.fn.now(),
      })),
    )
    .onConflict('project_id')
    .merge({
      project_code: knex.raw('EXCLUDED.project_code'),
      name: knex.raw('EXCLUDED.name'),
      program_id: knex.raw('EXCLUDED.program_id'),
      client_name: knex.raw('EXCLUDED.client_name'),
      country: knex.raw('EXCLUDED.country'),
      site_location: knex.raw('EXCLUDED.site_location'),
      site_lat: knex.raw('EXCLUDED.site_lat'),
      site_lng: knex.raw('EXCLUDED.site_lng'),
      timezone: knex.raw('EXCLUDED.timezone'),
      is_civil: knex.raw('EXCLUDED.is_civil'),
      is_mechanical: knex.raw('EXCLUDED.is_mechanical'),
      is_electrical: knex.raw('EXCLUDED.is_electrical'),
      expected_start_date: knex.raw('EXCLUDED.expected_start_date'),
      expected_end_date: knex.raw('EXCLUDED.expected_end_date'),
      estimated_value: knex.raw('EXCLUDED.estimated_value'),
      currency: knex.raw('EXCLUDED.currency'),
      status: knex.raw('EXCLUDED.status'),
      holiday_calendar_id: holidayCalendarId,
      updated_at: knex.fn.now(),
    });

  // 3. Project status history — only for projects whose current status is a
  // transition away from the 'active' state every project is created in
  // (from_status is NOT NULL, so there's no "initial creation" row to log).
  if (await knex.schema.hasTable('project_status_history')) {
    const transitioned = REAL_PROJECTS.filter((p) => p.status !== 'active');
    await knex('project_status_history')
      .insert(
        transitioned.map((p, i) => ({
          history_id: `33000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
          project_id: p.project_id,
          from_status: 'active',
          to_status: p.status,
          reason: p.on_hold_reason ?? null,
          actor_id: EXISTING_USER_IDS.PROJECT_CREATOR,
          changed_at: knex.fn.now(),
        })),
      )
      .onConflict('history_id')
      .merge({
        to_status: knex.raw('EXCLUDED.to_status'),
        reason: knex.raw('EXCLUDED.reason'),
        changed_at: knex.fn.now(),
      });
  }

  // 4. Roles (ABAC project-scoped grants)
  await knex('roles')
    .insert(
      TEAM_ASSIGNMENTS.map((t, i) => ({
        attribute_id: `34000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`,
        user_id: t.user_id,
        role: t.role,
        scope_type: 'project',
        program_id: null,
        project_id: t.project_id,
        granted_by: EXISTING_USER_IDS.ADMIN,
        granted_at: knex.fn.now(),
      })),
    )
    .onConflict('attribute_id')
    .merge({
      user_id: knex.raw('EXCLUDED.user_id'),
      role: knex.raw('EXCLUDED.role'),
      scope_type: knex.raw('EXCLUDED.scope_type'),
      project_id: knex.raw('EXCLUDED.project_id'),
      granted_by: knex.raw('EXCLUDED.granted_by'),
      revoked_at: null,
      revoked_by: null,
      revoke_reason: null,
    });

  // 4b. e2e role-access fixture grants (not real project team members — see
  // EXISTING_USER_IDS.E2E_PM / E2E_SITE_ENGINEER above).
  await knex('roles')
    .insert([
      {
        attribute_id: '35000000-0000-0000-0000-000000000001',
        user_id: EXISTING_USER_IDS.E2E_PM,
        role: 'PM',
        scope_type: 'project',
        program_id: null,
        project_id: REAL_PROJECT_IDS.UTAWALA_AUTOGAS,
        granted_by: EXISTING_USER_IDS.ADMIN,
        granted_at: knex.fn.now(),
      },
      {
        attribute_id: '35000000-0000-0000-0000-000000000002',
        user_id: EXISTING_USER_IDS.E2E_PM,
        role: 'PM',
        scope_type: 'project',
        program_id: null,
        project_id: REAL_PROJECT_IDS.KERICHO,
        granted_by: EXISTING_USER_IDS.ADMIN,
        granted_at: knex.fn.now(),
      },
      {
        attribute_id: '35000000-0000-0000-0000-000000000003',
        user_id: EXISTING_USER_IDS.E2E_SITE_ENGINEER,
        role: 'SiteEngineer',
        scope_type: 'project',
        program_id: null,
        project_id: REAL_PROJECT_IDS.DOMINICAN_NUNS,
        granted_by: EXISTING_USER_IDS.ADMIN,
        granted_at: knex.fn.now(),
      },
      {
        attribute_id: '35000000-0000-0000-0000-000000000004',
        user_id: EXISTING_USER_IDS.E2E_SITE_ENGINEER,
        role: 'SiteEngineer',
        scope_type: 'project',
        program_id: null,
        project_id: REAL_PROJECT_IDS.NAKURU,
        granted_by: EXISTING_USER_IDS.ADMIN,
        granted_at: knex.fn.now(),
      },
    ])
    .onConflict('attribute_id')
    .merge({
      project_id: knex.raw('EXCLUDED.project_id'),
      revoked_at: null,
      revoked_by: null,
      revoke_reason: null,
    });

  // 5. Project team members
  if (await knex.schema.hasTable('project_team_members')) {
    await knex('project_team_members')
      .insert(
        TEAM_ASSIGNMENTS.map((t) => ({
          project_id: t.project_id,
          user_id: t.user_id,
          is_team_lead: t.is_team_lead,
          added_at: knex.fn.now(),
        })),
      )
      .onConflict(['project_id', 'user_id'])
      .merge({ is_team_lead: knex.raw('EXCLUDED.is_team_lead') });
  }

  // 6. Project stages — stages before the current one are complete, the
  // current one is active (or complete, for projects already marked complete).
  if (await knex.schema.hasTable('project_stage')) {
    const stageRows: Array<{
      project_id: string;
      stage_no: number;
      in_scope: boolean;
      state: 'not_started' | 'active' | 'inactive' | 'complete';
      added_to_scope_by: string;
      added_to_scope_at: Knex.Raw;
      last_changed_by: string;
      last_changed_at: Knex.Raw;
    }> = [];

    for (const p of REAL_PROJECTS) {
      const scopeUpTo = Math.max(p.current_stage_no, 8); // develop+deliver phases, plus O&M if that's current
      for (let s = 1; s <= 10; s++) {
        let state: 'not_started' | 'active' | 'inactive' | 'complete' = 'not_started';
        if (s < p.current_stage_no) state = 'complete';
        else if (s === p.current_stage_no) state = p.status === 'complete' ? 'complete' : 'active';

        stageRows.push({
          project_id: p.project_id,
          stage_no: s,
          in_scope: s <= scopeUpTo,
          state,
          added_to_scope_by: EXISTING_USER_IDS.PROJECT_CREATOR,
          added_to_scope_at: knex.fn.now(),
          last_changed_by: p.team_lead_id,
          last_changed_at: knex.fn.now(),
        });
      }
    }

    await knex('project_stage')
      .insert(stageRows)
      .onConflict(['project_id', 'stage_no'])
      .merge({
        in_scope: knex.raw('EXCLUDED.in_scope'),
        state: knex.raw('EXCLUDED.state'),
        last_changed_by: knex.raw('EXCLUDED.last_changed_by'),
        last_changed_at: knex.fn.now(),
      });
  }

  // 7. Custom milestones (Peace Junior's 3-day install plan)
  if (await knex.schema.hasTable('custom_milestones')) {
    await knex('custom_milestones')
      .insert(
        PEACE_JUNIOR_MILESTONES.map((m) => ({
          milestone_id: m.milestone_id,
          project_id: REAL_PROJECT_IDS.PEACE_JUNIOR,
          stage_no: 6,
          title: m.title,
          planned_date: m.planned_date,
          created_by: EXISTING_USER_IDS.BENEDETTE_MARIGI,
          updated_by: EXISTING_USER_IDS.BENEDETTE_MARIGI,
        })),
      )
      .onConflict('milestone_id')
      .merge({
        title: knex.raw('EXCLUDED.title'),
        planned_date: knex.raw('EXCLUDED.planned_date'),
        updated_by: knex.raw('EXCLUDED.updated_by'),
      });
  }
}
