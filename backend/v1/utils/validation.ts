import Joi from 'joi';
import type { CreateUserInput } from '../database/utils/database.js';
import type { RoleName, ScopeType } from '../database/utils/database.js';
import type { StageEvent, StageState } from '../database/utils/database.js';

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