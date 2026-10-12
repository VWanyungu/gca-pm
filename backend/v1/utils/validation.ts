import Joi from 'joi';
import type {
  CreateUserInput,
  RoleName,
  ScopeType,
  StageEvent,
  StageState,
  ActivityStatus,
  ProjectStatus,
  PartyType,
  DprStatus,
  DprEffectsSeverity,
  DprProgressSource,
} from '../database/utils/database.js';

export const createUserSchema = Joi.object<CreateUserInput>({
  id: Joi.string().uuid().required(),
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email().lowercase().required(),
  passwordHash: Joi.string().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
});

export interface CreateRoleBody {
  userId: string;
  role: RoleName;
  scopeType: ScopeType;
  programId?: number | null;
  projectId?: string | null;
}

export interface RevokeRoleBody {
  reason?: string | null;
}

export interface ListRolesQuery {
  userId?: string;
  page?: number;
  limit?: number;
}

const ROLE_NAMES: RoleName[] = ['PM', 'Planner', 'SiteEngineer', 'ExCo', 'Admin', 'ProjectCreator'];
const SCOPE_TYPES: ScopeType[] = ['global', 'program', 'project'];

export const createRoleSchema = Joi.object<CreateRoleBody>({
  userId: Joi.string().uuid().required(),
  role: Joi.string().valid(...ROLE_NAMES).required(),
  scopeType: Joi.string().valid(...SCOPE_TYPES).required(),
  programId: Joi.when('scopeType', {
    is: 'program',
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.any().strip(),
  }),
  projectId: Joi.when('scopeType', {
    is: 'project',
    then: Joi.string().uuid().required(),
    otherwise: Joi.any().strip(),
  }),
});

export const revokeRoleParamsSchema = Joi.object({
  attributeId: Joi.string().uuid().required(),
});

export const revokeRoleBodySchema = Joi.object<RevokeRoleBody>({
  reason: Joi.string().trim().max(10000).allow(null, '').optional(),
});

export const listRolesQuerySchema = Joi.object<ListRolesQuery>({
  userId: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export interface CreateRiskCategoryBody {
  code: string;
  name: string;
  sort_order: number;
  is_active?: boolean;
}

export interface UpdateRiskCategoryBody {
  code?: string;
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ListRiskCategoriesQuery {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export const createRiskCategorySchema = Joi.object<CreateRiskCategoryBody>({
  code: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).min(2).max(50).required(),
  name: Joi.string().trim().min(1).max(100).required(),
  sort_order: Joi.number().integer().min(0).max(32767).required(),
  is_active: Joi.boolean().optional(),
});

export const updateRiskCategorySchema = Joi.object<UpdateRiskCategoryBody>({
  code: Joi.string().trim().lowercase().pattern(/^[a-z0-9_]+$/).min(2).max(50).optional(),
  name: Joi.string().trim().min(1).max(100).optional(),
  sort_order: Joi.number().integer().min(0).max(32767).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

export const riskCategoryIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const listRiskCategoriesQuerySchema = Joi.object<ListRiskCategoriesQuery>({
  includeInactive: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export type RiskStatusLiteral = 'open' | 'mitigated' | 'closed' | 'dismissed';
export type RiskKindLiteral = 'risk' | 'issue';

export interface CreateRiskIssueBody {
  title: string;
  description?: string | null;
  category_id: number;
  stage_no?: number | null;
  likelihood?: number | null;
  impact: number;
  owner_id?: string;
  mitigation?: string | null;
  kind: RiskKindLiteral;
}

export interface UpdateRiskIssueBody {
  title?: string;
  description?: string | null;
  category_id?: number;
  stage_no?: number | null;
  likelihood?: number | null;
  impact?: number;
  owner_id?: string;
  mitigation?: string | null;
  status?: RiskStatusLiteral;
  dismissal_reason?: string | null;
  kind?: 'issue';
}

export interface ListRiskIssuesQuery {
  status?: RiskStatusLiteral | 'auto_resolved';
  kind?: RiskKindLiteral;
  page?: number;
  limit?: number;
}

export const riskIssueProjectParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const riskIssueParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  riskId: Joi.string().uuid().required(),
});

export const createRiskIssueSchema = Joi.object<CreateRiskIssueBody>({
  title: Joi.string().trim().min(1).max(500).required(),
  description: Joi.string().trim().max(10000).allow(null, '').optional(),
  category_id: Joi.number().integer().positive().required(),
  stage_no: Joi.number().integer().min(1).allow(null).optional(),
  // likelihood is required when kind='risk' (AC-RSK-01 + DB check ck_risk_likelihood_for_risks).
  likelihood: Joi.when('kind', {
    is: 'risk',
    then: Joi.number().integer().min(1).max(5).required(),
    otherwise: Joi.any().strip(),
  }),
  impact: Joi.number().integer().min(1).max(5).required(),
  owner_id: Joi.string().uuid().optional(),
  mitigation: Joi.string().trim().max(10000).allow(null, '').optional(),
  kind: Joi.string().valid('risk', 'issue').required(),
});

export const updateRiskIssueSchema = Joi.object<UpdateRiskIssueBody>({
  title: Joi.string().trim().min(1).max(500).optional(),
  description: Joi.string().trim().max(10000).allow(null, '').optional(),
  category_id: Joi.number().integer().positive().optional(),
  stage_no: Joi.number().integer().min(1).allow(null).optional(),
  likelihood: Joi.number().integer().min(1).max(5).allow(null).optional(),
  impact: Joi.number().integer().min(1).max(5).optional(),
  owner_id: Joi.string().uuid().optional(),
  mitigation: Joi.string().trim().max(10000).allow(null, '').optional(),
  status: Joi.string().valid('open', 'mitigated', 'closed', 'dismissed').optional(),
  // Required when transitioning to dismissed (AC-RSK-02).
  dismissal_reason: Joi.when('status', {
    is: 'dismissed',
    then: Joi.string().trim().min(1).max(10000).required(),
    otherwise: Joi.string().trim().max(10000).allow(null, '').optional(),
  }),
  // AC-RSK-03: risk → issue conversion is one-way; kind can only ever be set to 'issue'.
  kind: Joi.string().valid('issue').optional(),
}).min(1);

export const listRiskIssuesQuerySchema = Joi.object<ListRiskIssuesQuery>({
  status: Joi.string().valid('open', 'mitigated', 'closed', 'dismissed', 'auto_resolved').optional(),
  kind: Joi.string().valid('risk', 'issue').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});


export interface CreateProgramBody {
  name: string;
  is_active?: boolean;
}

export interface UpdateProgramBody {
  name?: string;
  is_active?: boolean;
}

export interface ListProgramsQuery {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export const createProgramSchema = Joi.object<CreateProgramBody>({
  name: Joi.string().trim().min(1).max(255).required(),
  is_active: Joi.boolean().optional(),
});

export const updateProgramSchema = Joi.object<UpdateProgramBody>({
  name: Joi.string().trim().min(1).max(255).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

export const programIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

export const listProgramsQuerySchema = Joi.object<ListProgramsQuery>({
  includeInactive: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export interface CreateWeatherCategoryBody {
  name: string;
  sort_order: number;
  is_active?: boolean;
}

export interface UpdateWeatherCategoryBody {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ListWeatherCategoriesQuery {
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

export const createWeatherCategorySchema = Joi.object<CreateWeatherCategoryBody>({
  name: Joi.string().trim().min(1).max(100).required(),
  sort_order: Joi.number().integer().min(0).max(32767).required(),
  is_active: Joi.boolean().optional(),
});

export const updateWeatherCategorySchema = Joi.object<UpdateWeatherCategoryBody>({
  name: Joi.string().trim().min(1).max(100).optional(),
  sort_order: Joi.number().integer().min(0).max(32767).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

export const weatherCategoryIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});
export const listWeatherCategoriesQuerySchema = Joi.object<ListWeatherCategoriesQuery>({
  includeInactive: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

export interface CreateStageStateHistoryBody {
  stage_no: number;
  event: StageEvent;
  from_state?: StageState | null;
  to_state: StageState;
  reason?: string | null;
  checklist_snapshot?: Record<string, unknown> | null;
  closure_notes?: string | null;
  submission_id?: string | null;
  update_project_stage?: boolean;
}

export interface UpdateStageStateHistoryBody {
  from_state?: StageState | null;
  to_state?: StageState;
  reason?: string | null;
  checklist_snapshot?: Record<string, unknown> | null;
  closure_notes?: string | null;
  submission_id?: string | null;
}

export interface ListStageStateHistoryQuery {
  stage_no?: number;
  event?: StageEvent;
  page?: number;
  limit?: number;
}

const STAGE_EVENTS: StageEvent[] = [
  'added_to_scope',
  'removed_from_scope',
  'activated',
  'deactivated',
  'completed',
  'reopened',
];

const STAGE_STATES: StageState[] = ['not_started', 'active', 'inactive', 'complete'];

export const stageStateHistoryProjectParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const stageStateHistoryEventParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  eventId: Joi.string().uuid().required(),
});

export const createStageStateHistorySchema = Joi.object<CreateStageStateHistoryBody>({
  stage_no: Joi.number().integer().min(1).max(10).required(),
  event: Joi.string().valid(...STAGE_EVENTS).required(),
  from_state: Joi.string().valid(...STAGE_STATES).allow(null).optional(),
  to_state: Joi.string().valid(...STAGE_STATES).required(),
  reason: Joi.string().trim().max(10000).allow(null, '').optional(),
  checklist_snapshot: Joi.when('event', {
    is: 'completed',
    then: Joi.object().default({ template_id: null, items: [] }),
    otherwise: Joi.any().strip(),
  }),
  closure_notes: Joi.when('event', {
    is: 'completed',
    then: Joi.string().trim().max(10000).allow(null, '').optional(),
    otherwise: Joi.any().strip(),
  }),
  submission_id: Joi.string().uuid().allow(null).optional(),
  update_project_stage: Joi.boolean().default(true),
});

export const updateStageStateHistorySchema = Joi.object<UpdateStageStateHistoryBody>({
  from_state: Joi.string().valid(...STAGE_STATES).allow(null).optional(),
  to_state: Joi.string().valid(...STAGE_STATES).optional(),
  reason: Joi.string().trim().max(10000).allow(null, '').optional(),
  checklist_snapshot: Joi.object().allow(null).optional(),
  closure_notes: Joi.string().trim().max(10000).allow(null, '').optional(),
  submission_id: Joi.string().uuid().allow(null).optional(),
}).min(1);

export const listStageStateHistoryQuerySchema = Joi.object<ListStageStateHistoryQuery>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  event: Joi.string().valid(...STAGE_EVENTS).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

export interface CreateProjectStageBody {
  stage_no: number;
  in_scope?: boolean;
  state?: StageState;
  reason?: string | null;
}

export interface UpdateProjectStageBody {
  state?: StageState;
  in_scope?: boolean;
  reason?: string | null;
  checklist_snapshot?: Record<string, unknown> | null;
  closure_notes?: string | null;
}

export interface ListProjectStagesQuery {
  in_scope?: boolean;
  state?: StageState;
}

export const projectStageProjectParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const projectStageParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  stageNo: Joi.number().integer().min(1).max(10).required(),
});

export const listProjectStagesQuerySchema = Joi.object<ListProjectStagesQuery>({
  in_scope: Joi.boolean().optional(),
  state: Joi.string().valid(...STAGE_STATES).optional(),
});

export const createProjectStageSchema = Joi.object<CreateProjectStageBody>({
  stage_no: Joi.number().integer().min(1).max(10).required(),
  in_scope: Joi.boolean().default(true),
  state: Joi.string().valid(...STAGE_STATES).default('not_started'),
  reason: Joi.string().trim().max(10000).allow(null, '').optional(),
});

export const updateProjectStageSchema = Joi.object<UpdateProjectStageBody>({
  state: Joi.string().valid(...STAGE_STATES).optional(),
  in_scope: Joi.boolean().optional(),
  reason: Joi.string().trim().max(10000).allow(null, '').optional(),
  checklist_snapshot: Joi.object().allow(null).optional(),
  closure_notes: Joi.string().trim().max(10000).allow(null, '').optional(),
}).min(1);

const ACTIVITY_STATUSES: ActivityStatus[] = ['open', 'in_progress', 'done', 'cancelled'];

export interface CreateStageActivityBody {
  stage_no: number;
  title: string;
  description?: string | null;
  status?: ActivityStatus;
  due_date?: string | null;
  owner_id?: string | null;
  attachment?: CreateStageActivityAttachmentBody | string;
  attachments?: (CreateStageActivityAttachmentBody | string)[];
}

export interface UpdateStageActivityBody {
  stage_no?: number;
  title?: string;
  description?: string | null;
  status?: ActivityStatus;
  due_date?: string | null;
  owner_id?: string | null;
}

export interface ListStageActivitiesQuery {
  stage_no?: number;
  status?: ActivityStatus;
  owner_id?: string;
  page?: number;
  limit?: number;
}

export const stageActivityProjectParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const stageActivityParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  activityId: Joi.string().uuid().required(),
});

const stageActivityAttachmentItemSchema = Joi.alternatives().try(
  Joi.string().trim().min(1),
  Joi.object({
    file: Joi.string().optional(),
    file_id: Joi.string().uuid().optional(),
    attachment_id: Joi.string().max(1000).optional(),
    caption: Joi.string().trim().max(1000).allow(null, '').optional(),
    sort_order: Joi.number().integer().min(0).max(32767).default(0),
  }),
);

export const createStageActivitySchema = Joi.object<CreateStageActivityBody>({
  stage_no: Joi.number().integer().min(1).max(10).required(),
  title: Joi.string().trim().min(1).max(500).required(),
  description: Joi.string().trim().max(10000).allow(null, '').optional(),
  status: Joi.string().valid(...ACTIVITY_STATUSES).default('open'),
  due_date: Joi.string().isoDate().allow(null).optional(),
  owner_id: Joi.string().uuid().allow(null).optional(),
  attachment: stageActivityAttachmentItemSchema.optional(),
  attachments: Joi.array().items(stageActivityAttachmentItemSchema).max(20).optional(),
});

export const updateStageActivitySchema = Joi.object<UpdateStageActivityBody>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  title: Joi.string().trim().min(1).max(500).optional(),
  description: Joi.string().trim().max(10000).allow(null, '').optional(),
  status: Joi.string().valid(...ACTIVITY_STATUSES).optional(),
  due_date: Joi.string().isoDate().allow(null).optional(),
  owner_id: Joi.string().uuid().allow(null).optional(),
}).min(1);

export const listStageActivitiesQuerySchema = Joi.object<ListStageActivitiesQuery>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  status: Joi.string().valid(...ACTIVITY_STATUSES).optional(),
  owner_id: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

export interface CreateStageActivityAttachmentBody {
  file?: string;
  file_id?: string;
  attachment_id?: string;
  caption?: string | null;
  sort_order?: number;
}

export interface UpdateStageActivityAttachmentBody {
  caption?: string | null;
  sort_order?: number;
}

export interface ListStageActivityAttachmentsQuery {
  includeRemoved?: boolean;
}

export const stageActivityAttachmentParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  activityId: Joi.string().uuid().required(),
  attachmentId: Joi.string().required(),
});

export const stageActivityAttachmentListParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  activityId: Joi.string().uuid().required(),
});

export const createStageActivityAttachmentSchema = Joi.object<CreateStageActivityAttachmentBody>({
  file: Joi.string().optional(),
  file_id: Joi.string().uuid().optional(),
  attachment_id: Joi.string().max(1000).optional(),
  caption: Joi.string().trim().max(1000).allow(null, '').optional(),
  sort_order: Joi.number().integer().min(0).max(32767).default(0),
});

export const updateStageActivityAttachmentSchema = Joi.object<UpdateStageActivityAttachmentBody>({
  caption: Joi.string().trim().max(1000).allow(null, '').optional(),
  sort_order: Joi.number().integer().min(0).max(32767).optional(),
}).min(1);

export const listStageActivityAttachmentsQuerySchema = Joi.object<ListStageActivityAttachmentsQuery>({
  includeRemoved: Joi.boolean().default(false),
});

const PROJECT_STATUSES: ProjectStatus[] = ['active', 'on_hold', 'complete', 'cancelled'];

export interface CreateProjectBody {
  project_code: string;
  name: string;
  program_id: number;
  client_name?: string | null;
  country?: string | null;
  site_location?: string | null;
  site_lat?: number | null;
  site_lng?: number | null;
  timezone?: string;
  is_civil?: boolean;
  is_mechanical?: boolean;
  is_electrical?: boolean;
  expected_start_date?: string | null;
  expected_end_date?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  status?: ProjectStatus;
  legacy_source_ref?: string | null;
  holiday_calendar_id?: number | null;
  dpr_expected_weekdays?: number[];
  pm_user_id?: string | null;
  planner_user_id?: string | null;
  scope_stages?: number[];
  initial_active_stages?: number[];
}

export interface UpdateProjectBody {
  name?: string;
  program_id?: number;
  client_name?: string | null;
  country?: string | null;
  site_location?: string | null;
  site_lat?: number | null;
  site_lng?: number | null;
  timezone?: string;
  is_civil?: boolean;
  is_mechanical?: boolean;
  is_electrical?: boolean;
  expected_start_date?: string | null;
  expected_end_date?: string | null;
  estimated_value?: number | null;
  currency?: string | null;
  legacy_source_ref?: string | null;
  holiday_calendar_id?: number | null;
  dpr_expected_weekdays?: number[];
  status?: ProjectStatus;
  status_reason?: string | null;
}

export interface ListProjectsQuery {
  program_id?: number;
  status?: ProjectStatus;
  country?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const projectIdParamSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const suggestProjectCodeQuerySchema = Joi.object({
  program_id: Joi.number().integer().required(),
  year: Joi.number().integer().min(2000).max(2100).optional(),
});

export const createProjectSchema = Joi.object<CreateProjectBody>({
  project_code: Joi.string()
    .pattern(/^[0-9]{3}-[0-9]{3}\.[0-9]{4}$/)
    .required()
    .messages({
      'string.pattern.base': 'project_code must match NNN-NNN.YYYY format (e.g. 001-001.2026)',
    }),
  name: Joi.string().trim().min(1).max(500).required(),
  program_id: Joi.number().integer().required(),
  client_name: Joi.string().trim().max(500).allow(null, '').optional(),
  country: Joi.string().trim().max(100).allow(null, '').optional(),
  site_location: Joi.string().trim().max(500).allow(null, '').optional(),
  site_lat: Joi.number().min(-90).max(90).allow(null).optional(),
  site_lng: Joi.number().min(-180).max(180).allow(null).optional(),
  timezone: Joi.string().trim().default('Africa/Nairobi'),
  is_civil: Joi.boolean().default(false),
  is_mechanical: Joi.boolean().default(false),
  is_electrical: Joi.boolean().default(false),
  expected_start_date: Joi.string().isoDate().allow(null).optional(),
  expected_end_date: Joi.string().isoDate().allow(null).optional(),
  estimated_value: Joi.number().min(0).allow(null).optional(),
  currency: Joi.string().trim().length(3).uppercase().allow(null).optional(),
  status: Joi.string().valid(...PROJECT_STATUSES).default('active'),
  legacy_source_ref: Joi.string().trim().max(255).allow(null, '').optional(),
  holiday_calendar_id: Joi.number().integer().allow(null).optional(),
  dpr_expected_weekdays: Joi.array()
    .items(Joi.number().integer().min(1).max(7))
    .default([1, 2, 3, 4, 5, 6]),
  pm_user_id: Joi.string().uuid().allow(null).optional(),
  planner_user_id: Joi.string().uuid().allow(null).optional(),
  scope_stages: Joi.array().items(Joi.number().integer().min(1).max(10)).min(1).optional(),
  initial_active_stages: Joi.array().items(Joi.number().integer().min(1).max(10)).min(1).optional(),
});

export const updateProjectSchema = Joi.object<UpdateProjectBody>({
  name: Joi.string().trim().min(1).max(500).optional(),
  program_id: Joi.number().integer().optional(),
  client_name: Joi.string().trim().max(500).allow(null, '').optional(),
  country: Joi.string().trim().max(100).allow(null, '').optional(),
  site_location: Joi.string().trim().max(500).allow(null, '').optional(),
  site_lat: Joi.number().min(-90).max(90).allow(null).optional(),
  site_lng: Joi.number().min(-180).max(180).allow(null).optional(),
  timezone: Joi.string().trim().optional(),
  is_civil: Joi.boolean().optional(),
  is_mechanical: Joi.boolean().optional(),
  is_electrical: Joi.boolean().optional(),
  expected_start_date: Joi.string().isoDate().allow(null).optional(),
  expected_end_date: Joi.string().isoDate().allow(null).optional(),
  estimated_value: Joi.number().min(0).allow(null).optional(),
  currency: Joi.string().trim().length(3).uppercase().allow(null).optional(),
  legacy_source_ref: Joi.string().trim().max(255).allow(null, '').optional(),
  holiday_calendar_id: Joi.number().integer().allow(null).optional(),
  dpr_expected_weekdays: Joi.array().items(Joi.number().integer().min(1).max(7)).optional(),
  status: Joi.string().valid(...PROJECT_STATUSES).optional(),
  status_reason: Joi.string().trim().max(10000).allow(null, '').optional(),
}).min(1);

export const listProjectsQuerySchema = Joi.object<ListProjectsQuery>({
  program_id: Joi.number().integer().optional(),
  status: Joi.string().valid(...PROJECT_STATUSES).optional(),
  country: Joi.string().trim().optional(),
  search: Joi.string().trim().max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const PARTY_TYPES: PartyType[] = ['contractor', 'subcontractor'];

export interface CreateContractorBody {
  name: string;
  registration_no?: string | null;
  is_active?: boolean;
}

export interface UpdateContractorBody {
  name?: string;
  registration_no?: string | null;
  is_active?: boolean;
}

export interface MergeContractorBody {
  target_contractor_id: string;
}

export interface ListContractorsQuery {
  search?: string;
  includeInactive?: boolean;
  includeMerged?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateProjectContractorBody {
  contractor_id?: string;
  contractor_name?: string;
  party_type?: PartyType;
  is_active?: boolean;
}

export interface UpdateProjectContractorBody {
  party_type?: PartyType;
  is_active?: boolean;
}

export interface ListProjectContractorsQuery {
  includeInactive?: boolean;
}

export const contractorIdParamSchema = Joi.object({
  contractorId: Joi.string().uuid().required(),
});

export const projectContractorParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  contractorId: Joi.string().uuid().optional(),
});

export const projectContractorLinkIdParamSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  projectContractorId: Joi.string().uuid().required(),
});

export const createContractorSchema = Joi.object<CreateContractorBody>({
  name: Joi.string().trim().min(1).max(500).required(),
  registration_no: Joi.string().trim().max(100).allow(null, '').optional(),
  is_active: Joi.boolean().default(true),
});

export const updateContractorSchema = Joi.object<UpdateContractorBody>({
  name: Joi.string().trim().min(1).max(500).optional(),
  registration_no: Joi.string().trim().max(100).allow(null, '').optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

export const mergeContractorSchema = Joi.object<MergeContractorBody>({
  target_contractor_id: Joi.string().uuid().required(),
});

export const listContractorsQuerySchema = Joi.object<ListContractorsQuery>({
  search: Joi.string().trim().max(100).optional(),
  includeInactive: Joi.boolean().default(false),
  includeMerged: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

export const createProjectContractorSchema = Joi.object<CreateProjectContractorBody>({
  contractor_id: Joi.string().uuid().optional(),
  contractor_name: Joi.string().trim().min(1).max(500).optional(),
  party_type: Joi.string().valid(...PARTY_TYPES).default('contractor'),
  is_active: Joi.boolean().default(true),
}).or('contractor_id', 'contractor_name');

export const updateProjectContractorSchema = Joi.object<UpdateProjectContractorBody>({
  party_type: Joi.string().valid(...PARTY_TYPES).optional(),
  is_active: Joi.boolean().optional(),
}).min(1);

export const listProjectContractorsQuerySchema = Joi.object<ListProjectContractorsQuery>({
  includeInactive: Joi.boolean().default(false),
});

export interface CreateCustomMilestoneBody {
  stage_no?: number | null;
  title: string;
  planned_date: string;
  forecast_date?: string | null;
  actual_date?: string | null;
  notes?: string | null;
}

export interface UpdateCustomMilestoneBody {
  stage_no?: number | null;
  title?: string;
  planned_date?: string;
  forecast_date?: string | null;
  actual_date?: string | null;
  notes?: string | null;
}

export interface ListCustomMilestonesQuery {
  stage_no?: number;
  includeRemoved?: boolean;
  all?: boolean;
  page?: number;
  limit?: number;
}

export const customMilestoneProjectParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
});

export const customMilestoneParamsSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  milestoneId: Joi.string().uuid().required(),
});

export const createCustomMilestoneSchema = Joi.object<CreateCustomMilestoneBody>({
  stage_no: Joi.number().integer().min(1).max(10).allow(null).optional(),
  title: Joi.string().trim().min(1).max(500).required(),
  planned_date: Joi.string().isoDate().required(),
  forecast_date: Joi.string().isoDate().allow(null).optional(),
  actual_date: Joi.string().isoDate().allow(null).optional(),
  notes: Joi.string().trim().max(10000).allow(null, '').optional(),
});

export const updateCustomMilestoneSchema = Joi.object<UpdateCustomMilestoneBody>({
  stage_no: Joi.number().integer().min(1).max(10).allow(null).optional(),
  title: Joi.string().trim().min(1).max(500).optional(),
  planned_date: Joi.string().isoDate().optional(),
  forecast_date: Joi.string().isoDate().allow(null).optional(),
  actual_date: Joi.string().isoDate().allow(null).optional(),
  notes: Joi.string().trim().max(10000).allow(null, '').optional(),
}).min(1);

export const listCustomMilestonesQuerySchema = Joi.object<ListCustomMilestonesQuery>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  includeRemoved: Joi.boolean().default(false),
  all: Joi.boolean().default(false),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

const DPR_STATUSES: DprStatus[] = ['draft', 'submitted'];
const DPR_EFFECTS_SEVERITIES: DprEffectsSeverity[] = ['none', 'minor', 'significant', 'stoppage'];
const DPR_PROGRESS_SOURCES: DprProgressSource[] = ['schedule_task', 'free_text'];

export interface CreateDprWorkItemInput {
  work_item_id?: string;
  sort_order?: number;
  work_area: string;
  work_carried_out: string;
}

export interface CreateDprActivityProgressInput {
  dpr_activity_progress_id?: string;
  sort_order?: number;
  source: DprProgressSource;
  task_id?: string | null;
  free_text?: string | null;
  today_pct: number;
  total_pct: number;
}

export interface CreateDprPersonnelRoleCountInput {
  personnel_role_id: number;
  headcount: number;
}

export interface CreateDprPersonnelGroupInput {
  personnel_group_id?: string;
  project_contractor_id: string;
  sort_order?: number;
  total_headcount: number;
  role_counts?: CreateDprPersonnelRoleCountInput[];
}

export interface CreateDprPhotoInput {
  photo_id?: string;
  file_id: string;
  caption?: string | null;
  sort_order?: number;
  taken_at?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
}

export interface CreateDprBody {
  stage_no?: number;
  report_date: string;
  site_location: string;
  contract_no?: string | null;
  weather_category_id?: number | null;
  temp_min_c?: number | null;
  temp_max_c?: number | null;
  humidity_pct?: number | null;
  wind?: string | null;
  effects_text?: string | null;
  effects_severity?: DprEffectsSeverity;
  equipment_text?: string | null;
  visitors_text?: string | null;
  delays_text?: string | null;
  incidents_text?: string | null;
  other_notes_text?: string | null;
  status?: DprStatus;
  work_items?: CreateDprWorkItemInput[];
  activity_progress?: CreateDprActivityProgressInput[];
  personnel_groups?: CreateDprPersonnelGroupInput[];
  photos?: CreateDprPhotoInput[];
}

export interface UpdateDprBody {
  stage_no?: number;
  report_date?: string;
  site_location?: string;
  contract_no?: string | null;
  weather_category_id?: number | null;
  temp_min_c?: number | null;
  temp_max_c?: number | null;
  humidity_pct?: number | null;
  wind?: string | null;
  effects_text?: string | null;
  effects_severity?: DprEffectsSeverity;
  equipment_text?: string | null;
  visitors_text?: string | null;
  delays_text?: string | null;
  incidents_text?: string | null;
  other_notes_text?: string | null;
  work_items?: CreateDprWorkItemInput[];
  activity_progress?: CreateDprActivityProgressInput[];
  personnel_groups?: CreateDprPersonnelGroupInput[];
  photos?: CreateDprPhotoInput[];
}

export interface ListDprsQuery {
  stage_no?: number;
  status?: DprStatus;
  from_date?: string;
  to_date?: string;
  author_id?: string;
  page?: number;
  limit?: number;
}

export const dprIdParamSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  dprId: Joi.string().uuid().required(),
});

export const createDprSchema = Joi.object<CreateDprBody>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  report_date: Joi.string().isoDate().required(),
  site_location: Joi.string().trim().min(1).max(500).required(),
  contract_no: Joi.string().trim().max(100).allow(null, '').optional(),
  weather_category_id: Joi.number().integer().allow(null).optional(),
  temp_min_c: Joi.number().min(-50).max(60).allow(null).optional(),
  temp_max_c: Joi.number().min(-50).max(60).allow(null).optional(),
  humidity_pct: Joi.number().integer().min(0).max(100).allow(null).optional(),
  wind: Joi.string().trim().max(100).allow(null, '').optional(),
  effects_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  effects_severity: Joi.string().valid(...DPR_EFFECTS_SEVERITIES).default('none'),
  equipment_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  visitors_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  delays_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  incidents_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  other_notes_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  status: Joi.string().valid(...DPR_STATUSES).default('draft'),
  work_items: Joi.array()
    .items(
      Joi.object({
        work_item_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        work_area: Joi.string().trim().min(1).max(500).required(),
        work_carried_out: Joi.string().trim().min(1).max(10000).required(),
      }),
    )
    .optional(),
  activity_progress: Joi.array()
    .items(
      Joi.object({
        dpr_activity_progress_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        source: Joi.string().valid(...DPR_PROGRESS_SOURCES).required(),
        task_id: Joi.string().uuid().allow(null).optional(),
        free_text: Joi.string().trim().max(10000).allow(null).optional(),
        today_pct: Joi.number().min(0).max(100).required(),
        total_pct: Joi.number().min(0).max(100).required(),
      }),
    )
    .optional(),
  personnel_groups: Joi.array()
    .items(
      Joi.object({
        personnel_group_id: Joi.string().uuid().optional(),
        project_contractor_id: Joi.string().uuid().required(),
        sort_order: Joi.number().integer().min(0).optional(),
        total_headcount: Joi.number().integer().min(0).required(),
        role_counts: Joi.array()
          .items(
            Joi.object({
              personnel_role_id: Joi.number().integer().required(),
              headcount: Joi.number().integer().min(1).required(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  photos: Joi.array()
    .items(
      Joi.object({
        photo_id: Joi.string().uuid().optional(),
        file_id: Joi.string().uuid().required(),
        caption: Joi.string().trim().max(1000).allow(null, '').optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        taken_at: Joi.string().isoDate().allow(null).optional(),
        gps_lat: Joi.number().min(-90).max(90).allow(null).optional(),
        gps_lng: Joi.number().min(-180).max(180).allow(null).optional(),
      }),
    )
    .max(20)
    .optional(),
});

export const updateDprSchema = Joi.object<UpdateDprBody>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  report_date: Joi.string().isoDate().optional(),
  site_location: Joi.string().trim().min(1).max(500).optional(),
  contract_no: Joi.string().trim().max(100).allow(null, '').optional(),
  weather_category_id: Joi.number().integer().allow(null).optional(),
  temp_min_c: Joi.number().min(-50).max(60).allow(null).optional(),
  temp_max_c: Joi.number().min(-50).max(60).allow(null).optional(),
  humidity_pct: Joi.number().integer().min(0).max(100).allow(null).optional(),
  wind: Joi.string().trim().max(100).allow(null, '').optional(),
  effects_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  effects_severity: Joi.string().valid(...DPR_EFFECTS_SEVERITIES).optional(),
  equipment_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  visitors_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  delays_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  incidents_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  other_notes_text: Joi.string().trim().max(10000).allow(null, '').optional(),
  work_items: Joi.array()
    .items(
      Joi.object({
        work_item_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        work_area: Joi.string().trim().min(1).max(500).required(),
        work_carried_out: Joi.string().trim().min(1).max(10000).required(),
      }),
    )
    .optional(),
  activity_progress: Joi.array()
    .items(
      Joi.object({
        dpr_activity_progress_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        source: Joi.string().valid(...DPR_PROGRESS_SOURCES).required(),
        task_id: Joi.string().uuid().allow(null).optional(),
        free_text: Joi.string().trim().max(10000).allow(null).optional(),
        today_pct: Joi.number().min(0).max(100).required(),
        total_pct: Joi.number().min(0).max(100).required(),
      }),
    )
    .optional(),
  personnel_groups: Joi.array()
    .items(
      Joi.object({
        personnel_group_id: Joi.string().uuid().optional(),
        project_contractor_id: Joi.string().uuid().required(),
        sort_order: Joi.number().integer().min(0).optional(),
        total_headcount: Joi.number().integer().min(0).required(),
        role_counts: Joi.array()
          .items(
            Joi.object({
              personnel_role_id: Joi.number().integer().required(),
              headcount: Joi.number().integer().min(1).required(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
  photos: Joi.array()
    .items(
      Joi.object({
        photo_id: Joi.string().uuid().optional(),
        file_id: Joi.string().uuid().required(),
        caption: Joi.string().trim().max(1000).allow(null, '').optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        taken_at: Joi.string().isoDate().allow(null).optional(),
        gps_lat: Joi.number().min(-90).max(90).allow(null).optional(),
        gps_lng: Joi.number().min(-180).max(180).allow(null).optional(),
      }),
    )
    .max(20)
    .optional(),
}).min(1);

export const listDprsQuerySchema = Joi.object<ListDprsQuery>({
  stage_no: Joi.number().integer().min(1).max(10).optional(),
  status: Joi.string().valid(...DPR_STATUSES).optional(),
  from_date: Joi.string().isoDate().optional(),
  to_date: Joi.string().isoDate().optional(),
  author_id: Joi.string().uuid().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});