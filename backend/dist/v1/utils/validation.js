import Joi from "joi";
export const createUserSchema = Joi.object({
    id: Joi.string().uuid().required(),
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    passwordHash: Joi.string().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
});
const USER_ROLE_NAMES = [
    "PM",
    "Planner",
    "SiteEngineer",
    "ExCo",
    "Admin",
    "ProjectCreator",
];
export const userIdParamSchema = Joi.object({
    id: Joi.string().uuid().required(),
});
export const listUsersQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().trim().max(200).optional(),
    globalRole: Joi.string()
        .valid(...USER_ROLE_NAMES)
        .optional(),
    status: Joi.string().valid("active", "deactivated").optional(),
});
export const adminCreateUserSchema = Joi.object({
    firstName: Joi.string().trim().min(1).max(50).required(),
    lastName: Joi.string().trim().min(1).max(50).required(),
    email: Joi.string().email().lowercase().required(),
    phone: Joi.string().trim().max(30).allow(null, "").optional(),
    globalRole: Joi.string()
        .valid(...USER_ROLE_NAMES)
        .allow(null)
        .optional(),
});
export const updateUserSchema = Joi.object({
    firstName: Joi.string().trim().min(1).max(50).optional(),
    lastName: Joi.string().trim().min(1).max(50).optional(),
    phone: Joi.string().trim().max(30).allow(null, "").optional(),
    globalRole: Joi.string()
        .valid(...USER_ROLE_NAMES)
        .allow(null)
        .optional(),
}).min(1);
export const setUserStatusSchema = Joi.object({
    status: Joi.string().valid("active", "deactivated").required(),
});
const ROLE_NAMES = [
    "PM",
    "Planner",
    "SiteEngineer",
    "ExCo",
    "Admin",
    "ProjectCreator",
];
const SCOPE_TYPES = ["global", "program", "project"];
export const createRoleSchema = Joi.object({
    userId: Joi.string().uuid().required(),
    role: Joi.string()
        .valid(...ROLE_NAMES)
        .required(),
    scopeType: Joi.string()
        .valid(...SCOPE_TYPES)
        .required(),
    programId: Joi.when("scopeType", {
        is: "program",
        then: Joi.number().integer().positive().required(),
        otherwise: Joi.any().strip(),
    }),
    projectId: Joi.when("scopeType", {
        is: "project",
        then: Joi.string().uuid().required(),
        otherwise: Joi.any().strip(),
    }),
});
export const revokeRoleParamsSchema = Joi.object({
    attributeId: Joi.string().uuid().required(),
});
export const revokeRoleBodySchema = Joi.object({
    reason: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const listRolesQuerySchema = Joi.object({
    userId: Joi.string().uuid().optional(),
    projectId: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
});
export const reassignMainRoleSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    role: Joi.string().valid("PM", "Planner").required(),
    newUserId: Joi.string().uuid().required(),
    reason: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const createRiskCategorySchema = Joi.object({
    code: Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9_]+$/)
        .min(2)
        .max(50)
        .required(),
    name: Joi.string().trim().min(1).max(100).required(),
    sort_order: Joi.number().integer().min(0).max(32767).required(),
    is_active: Joi.boolean().optional(),
});
export const updateRiskCategorySchema = Joi.object({
    code: Joi.string()
        .trim()
        .lowercase()
        .pattern(/^[a-z0-9_]+$/)
        .min(2)
        .max(50)
        .optional(),
    name: Joi.string().trim().min(1).max(100).optional(),
    sort_order: Joi.number().integer().min(0).max(32767).optional(),
    is_active: Joi.boolean().optional(),
}).min(1);
export const riskCategoryIdParamSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
});
export const listRiskCategoriesQuerySchema = Joi.object({
    includeInactive: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});
export const riskIssueProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const riskIssueParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    riskId: Joi.string().uuid().required(),
});
export const createRiskIssueSchema = Joi.object({
    title: Joi.string().trim().min(1).max(500).required(),
    description: Joi.string().trim().max(10000).allow(null, "").optional(),
    category_id: Joi.number().integer().positive().required(),
    stage_no: Joi.number().integer().min(1).allow(null).optional(),
    // likelihood is required when kind='risk' (AC-RSK-01 + DB check ck_risk_likelihood_for_risks).
    likelihood: Joi.when("kind", {
        is: "risk",
        then: Joi.number().integer().min(1).max(5).required(),
        otherwise: Joi.any().strip(),
    }),
    impact: Joi.number().integer().min(1).max(5).required(),
    owner_id: Joi.string().uuid().optional(),
    mitigation: Joi.string().trim().max(10000).allow(null, "").optional(),
    review_by: Joi.string().isoDate().allow(null).optional(),
    kind: Joi.string().valid("risk", "issue").required(),
    // ck_risk_auto_is_risk: a risk raised from a schedule task is never an issue.
    source_task_id: Joi.when("kind", {
        is: "risk",
        then: Joi.string().uuid().allow(null).optional(),
        otherwise: Joi.any().strip(),
    }),
});
export const updateRiskIssueSchema = Joi.object({
    title: Joi.string().trim().min(1).max(500).optional(),
    description: Joi.string().trim().max(10000).allow(null, "").optional(),
    category_id: Joi.number().integer().positive().optional(),
    stage_no: Joi.number().integer().min(1).allow(null).optional(),
    likelihood: Joi.number().integer().min(1).max(5).allow(null).optional(),
    impact: Joi.number().integer().min(1).max(5).optional(),
    owner_id: Joi.string().uuid().optional(),
    mitigation: Joi.string().trim().max(10000).allow(null, "").optional(),
    review_by: Joi.string().isoDate().allow(null).optional(),
    status: Joi.string()
        .valid("open", "closed")
        .optional(),
    dismissal_reason: Joi.string().trim().max(10000).allow(null, "").optional(),
    // AC-RSK-03: risk → issue conversion is one-way; kind can only ever be set to 'issue'.
    kind: Joi.string().valid("issue").optional(),
}).min(1);
export const listRiskIssuesQuerySchema = Joi.object({
    status: Joi.string()
        .valid("open", "closed")
        .optional(),
    kind: Joi.string().valid("risk", "issue").optional(),
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    source: Joi.string().valid("manual", "overdue_task").optional(),
    rating: Joi.string().valid("low", "medium", "high").optional(),
    search: Joi.string().trim().max(200).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
export const changeRequestProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const changeRequestParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    changeId: Joi.string().uuid().required(),
});
// AC-GEN-10: cost_currency pairs with cost_impact (ck_cr_cost_currency_pair).
const costImpactField = Joi.number().precision(2).allow(null).optional();
const costCurrencyField = Joi.when("cost_impact", {
    is: Joi.number().required(),
    then: Joi.string().length(3).uppercase().required(),
    otherwise: Joi.string().length(3).uppercase().allow(null).optional(),
});
export const createChangeRequestSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).allow(null).optional(),
    type: Joi.string().valid("scope", "schedule", "cost").required(),
    title: Joi.string().trim().min(1).max(500).required(),
    scope_description: Joi.string().trim().min(1).max(10000).required(),
    reason: Joi.string().trim().min(1).max(10000).required(),
    supporting_notes: Joi.string().trim().max(10000).allow(null, "").optional(),
    cost_impact: costImpactField,
    cost_currency: costCurrencyField,
    schedule_impact_days: Joi.number().integer().allow(null).optional(),
    attachment_file_ids: Joi.array().items(Joi.string().uuid()).optional(),
});
export const updateChangeRequestSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).allow(null).optional(),
    type: Joi.string().valid("scope", "schedule", "cost").optional(),
    title: Joi.string().trim().min(1).max(500).optional(),
    scope_description: Joi.string().trim().min(1).max(10000).optional(),
    reason: Joi.string().trim().min(1).max(10000).optional(),
    supporting_notes: Joi.string().trim().max(10000).allow(null, "").optional(),
    cost_impact: costImpactField,
    cost_currency: costCurrencyField,
    schedule_impact_days: Joi.number().integer().allow(null).optional(),
    attachment_file_ids: Joi.array().items(Joi.string().uuid()).optional(),
}).min(1);
export const uploadChangeRequestAttachmentSchema = Joi.object({
    file: Joi.string().required(),
    filename: Joi.string().trim().max(500).required(),
});
export const decideChangeRequestSchema = Joi.object({
    decision: Joi.string().valid("approve", "reject").required(),
    // ck_ca_reject_comment_required
    comment: Joi.when("decision", {
        is: "reject",
        then: Joi.string().trim().min(1).max(10000).required(),
        otherwise: Joi.string().trim().max(10000).allow(null, "").optional(),
    }),
});
export const listChangeRequestsQuerySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    type: Joi.string().valid("scope", "schedule", "cost").optional(),
    status: Joi.string()
        .valid("pending", "approved", "rejected", "withdrawn", "noted")
        .optional(),
    search: Joi.string().trim().max(200).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
export const createProgramSchema = Joi.object({
    name: Joi.string().trim().min(1).max(255).required(),
    is_active: Joi.boolean().optional(),
});
export const updateProgramSchema = Joi.object({
    name: Joi.string().trim().min(1).max(255).optional(),
    is_active: Joi.boolean().optional(),
}).min(1);
export const programIdParamSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
});
export const listProgramsQuerySchema = Joi.object({
    includeInactive: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});
export const createWeatherCategorySchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    sort_order: Joi.number().integer().min(0).max(32767).required(),
    is_active: Joi.boolean().optional(),
});
export const updateWeatherCategorySchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).optional(),
    sort_order: Joi.number().integer().min(0).max(32767).optional(),
    is_active: Joi.boolean().optional(),
}).min(1);
export const weatherCategoryIdParamSchema = Joi.object({
    id: Joi.number().integer().positive().required(),
});
export const listWeatherCategoriesQuerySchema = Joi.object({
    includeInactive: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});
export const listPersonnelRolesQuerySchema = Joi.object({
    include_inactive: Joi.boolean().default(false),
});
export const createPersonnelRoleSchema = Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
});
const STAGE_EVENTS = [
    "added_to_scope",
    "removed_from_scope",
    "activated",
    "deactivated",
    "completed",
    "reopened",
];
const STAGE_STATES = [
    "not_started",
    "active",
    "inactive",
    "complete",
];
export const stageStateHistoryProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const stageStateHistoryEventParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    eventId: Joi.string().uuid().required(),
});
export const createStageStateHistorySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).required(),
    event: Joi.string()
        .valid(...STAGE_EVENTS)
        .required(),
    from_state: Joi.string()
        .valid(...STAGE_STATES)
        .allow(null)
        .optional(),
    to_state: Joi.string()
        .valid(...STAGE_STATES)
        .required(),
    reason: Joi.string().trim().max(10000).allow(null, "").optional(),
    checklist_snapshot: Joi.when("event", {
        is: "completed",
        then: Joi.object().default({ template_id: null, items: [] }),
        otherwise: Joi.any().strip(),
    }),
    closure_notes: Joi.when("event", {
        is: "completed",
        then: Joi.string().trim().max(10000).allow(null, "").optional(),
        otherwise: Joi.any().strip(),
    }),
    submission_id: Joi.string().uuid().allow(null).optional(),
    update_project_stage: Joi.boolean().default(true),
});
export const updateStageStateHistorySchema = Joi.object({
    from_state: Joi.string()
        .valid(...STAGE_STATES)
        .allow(null)
        .optional(),
    to_state: Joi.string()
        .valid(...STAGE_STATES)
        .optional(),
    reason: Joi.string().trim().max(10000).allow(null, "").optional(),
    checklist_snapshot: Joi.object().allow(null).optional(),
    closure_notes: Joi.string().trim().max(10000).allow(null, "").optional(),
    submission_id: Joi.string().uuid().allow(null).optional(),
}).min(1);
export const listStageStateHistoryQuerySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    event: Joi.string()
        .valid(...STAGE_EVENTS)
        .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
export const projectStageProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const projectStageParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    stageNo: Joi.number().integer().min(1).max(10).required(),
});
export const listProjectStagesQuerySchema = Joi.object({
    in_scope: Joi.boolean().optional(),
    state: Joi.string()
        .valid(...STAGE_STATES)
        .optional(),
});
export const createProjectStageSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).required(),
    in_scope: Joi.boolean().default(true),
    state: Joi.string()
        .valid(...STAGE_STATES)
        .default("not_started"),
    reason: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const updateProjectStageSchema = Joi.object({
    state: Joi.string()
        .valid(...STAGE_STATES)
        .optional(),
    in_scope: Joi.boolean().optional(),
    reason: Joi.string().trim().max(10000).allow(null, "").optional(),
    checklist_snapshot: Joi.object().allow(null).optional(),
    closure_notes: Joi.string().trim().max(10000).allow(null, "").optional(),
}).min(1);
const ACTIVITY_STATUSES = [
    "open",
    "in_progress",
    "done",
    "cancelled",
];
export const stageActivityProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const stageActivityParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    activityId: Joi.string().uuid().required(),
});
const stageActivityAttachmentItemSchema = Joi.alternatives().try(Joi.string().trim().min(1), Joi.object({
    file: Joi.string().optional(),
    file_id: Joi.string().uuid().optional(),
    attachment_id: Joi.string().max(1000).optional(),
    caption: Joi.string().trim().max(1000).allow(null, "").optional(),
    sort_order: Joi.number().integer().min(0).max(32767).default(0),
}));
export const createStageActivitySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).required(),
    title: Joi.string().trim().min(1).max(500).required(),
    description: Joi.string().trim().max(10000).allow(null, "").optional(),
    status: Joi.string()
        .valid(...ACTIVITY_STATUSES)
        .default("open"),
    due_date: Joi.string().isoDate().allow(null).optional(),
    owner_id: Joi.string().uuid().allow(null).optional(),
    attachment: stageActivityAttachmentItemSchema.optional(),
    attachments: Joi.array()
        .items(stageActivityAttachmentItemSchema)
        .max(20)
        .optional(),
});
export const updateStageActivitySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    title: Joi.string().trim().min(1).max(500).optional(),
    description: Joi.string().trim().max(10000).allow(null, "").optional(),
    status: Joi.string()
        .valid(...ACTIVITY_STATUSES)
        .optional(),
    due_date: Joi.string().isoDate().allow(null).optional(),
    owner_id: Joi.string().uuid().allow(null).optional(),
}).min(1);
export const listStageActivitiesQuerySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    status: Joi.string()
        .valid(...ACTIVITY_STATUSES)
        .optional(),
    owner_id: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
export const stageActivityAttachmentParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    activityId: Joi.string().uuid().required(),
    attachmentId: Joi.string().required(),
});
export const stageActivityAttachmentListParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    activityId: Joi.string().uuid().required(),
});
export const createStageActivityAttachmentSchema = Joi.object({
    file: Joi.string().optional(),
    file_id: Joi.string().uuid().optional(),
    attachment_id: Joi.string().max(1000).optional(),
    caption: Joi.string().trim().max(1000).allow(null, "").optional(),
    sort_order: Joi.number().integer().min(0).max(32767).default(0),
});
export const updateStageActivityAttachmentSchema = Joi.object({
    caption: Joi.string().trim().max(1000).allow(null, "").optional(),
    sort_order: Joi.number().integer().min(0).max(32767).optional(),
}).min(1);
export const listStageActivityAttachmentsQuerySchema = Joi.object({
    includeRemoved: Joi.boolean().default(false),
});
export const stageChecklistProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    stageNo: Joi.number().integer().min(1).max(10).required(),
});
export const stageChecklistItemParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    stageNo: Joi.number().integer().min(1).max(10).required(),
    itemId: Joi.string().uuid().required(),
});
export const createStageChecklistItemSchema = Joi.object({
    text: Joi.string().trim().min(1).max(10000).required(),
});
export const updateStageChecklistItemSchema = Joi.object({
    is_checked: Joi.boolean().optional(),
    text: Joi.string().trim().min(1).max(10000).optional(),
}).min(1);
const PROJECT_STATUSES = [
    "active",
    "on_hold",
    "complete",
    "cancelled",
    "deleted",
];
// 'deleted' is reached only through the dedicated delete flow (AC-PRJ-11), never set directly.
const CREATABLE_PROJECT_STATUSES = PROJECT_STATUSES.filter((s) => s !== "deleted");
export const projectIdParamSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const suggestProjectCodeQuerySchema = Joi.object({
    program_id: Joi.number().integer().required(),
    year: Joi.number().integer().min(2000).max(2100).optional(),
});
export const createProjectSchema = Joi.object({
    project_code: Joi.string()
        .pattern(/^[0-9]{3}-[0-9]{3}\.[0-9]{4}$/)
        .required()
        .messages({
        "string.pattern.base": "project_code must match NNN-NNN.YYYY format (e.g. 001-001.2026)",
    }),
    name: Joi.string().trim().min(1).max(500).required(),
    program_id: Joi.number().integer().required(),
    client_name: Joi.string().trim().max(500).allow(null, "").optional(),
    country: Joi.string().trim().max(100).allow(null, "").optional(),
    site_location: Joi.string().trim().max(500).allow(null, "").optional(),
    site_lat: Joi.number().min(-90).max(90).allow(null).optional(),
    site_lng: Joi.number().min(-180).max(180).allow(null).optional(),
    timezone: Joi.string().trim().default("Africa/Nairobi"),
    is_civil: Joi.boolean().default(false),
    is_mechanical: Joi.boolean().default(true),
    is_electrical: Joi.boolean().default(false),
    expected_start_date: Joi.string().isoDate().allow(null).optional(),
    expected_end_date: Joi.string().isoDate().allow(null).optional(),
    estimated_value: Joi.number().min(0).allow(null).optional(),
    currency: Joi.string().trim().length(3).uppercase().allow(null).optional(),
    status: Joi.string()
        .valid(...CREATABLE_PROJECT_STATUSES)
        .default("active"),
    legacy_source_ref: Joi.string().trim().max(255).allow(null, "").optional(),
    holiday_calendar_id: Joi.number().integer().allow(null).optional(),
    dpr_expected_weekdays: Joi.array()
        .items(Joi.number().integer().min(1).max(7))
        .default([1, 2, 3, 4, 5, 6]),
    pm_user_id: Joi.string().uuid().allow(null).optional(),
    planner_user_id: Joi.string().uuid().allow(null).optional(),
    scope_stages: Joi.array()
        .items(Joi.number().integer().min(1).max(10))
        .min(1)
        .optional(),
    initial_active_stages: Joi.array()
        .items(Joi.number().integer().min(1).max(10))
        .min(1)
        .optional(),
    site_engineer_user_ids: Joi.array().items(Joi.string().uuid()).optional(),
});
export const updateProjectSchema = Joi.object({
    name: Joi.string().trim().min(1).max(500).optional(),
    program_id: Joi.number().integer().optional(),
    client_name: Joi.string().trim().max(500).allow(null, "").optional(),
    country: Joi.string().trim().max(100).allow(null, "").optional(),
    site_location: Joi.string().trim().max(500).allow(null, "").optional(),
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
    legacy_source_ref: Joi.string().trim().max(255).allow(null, "").optional(),
    holiday_calendar_id: Joi.number().integer().allow(null).optional(),
    dpr_expected_weekdays: Joi.array()
        .items(Joi.number().integer().min(1).max(7))
        .optional(),
    status: Joi.string()
        .valid(...PROJECT_STATUSES)
        .optional(),
    status_reason: Joi.string().trim().max(10000).allow(null, "").optional(),
}).min(1);
export const listProjectsQuerySchema = Joi.object({
    program_id: Joi.number().integer().optional(),
    status: Joi.string()
        .valid(...PROJECT_STATUSES)
        .optional(),
    country: Joi.string().trim().optional(),
    search: Joi.string().trim().max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
const PARTY_TYPES = ["contractor", "subcontractor"];
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
export const createContractorSchema = Joi.object({
    name: Joi.string().trim().min(1).max(500).required(),
    registration_no: Joi.string().trim().max(100).allow(null, "").optional(),
    is_active: Joi.boolean().default(true),
});
export const updateContractorSchema = Joi.object({
    name: Joi.string().trim().min(1).max(500).optional(),
    registration_no: Joi.string().trim().max(100).allow(null, "").optional(),
    is_active: Joi.boolean().optional(),
}).min(1);
export const mergeContractorSchema = Joi.object({
    target_contractor_id: Joi.string().uuid().required(),
});
export const listContractorsQuerySchema = Joi.object({
    search: Joi.string().trim().max(100).optional(),
    includeInactive: Joi.boolean().default(false),
    includeMerged: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
export const createProjectContractorSchema = Joi.object({
    contractor_id: Joi.string().uuid().optional(),
    contractor_name: Joi.string().trim().min(1).max(500).optional(),
    party_type: Joi.string()
        .valid(...PARTY_TYPES)
        .default("contractor"),
    is_active: Joi.boolean().default(true),
}).or("contractor_id", "contractor_name");
export const updateProjectContractorSchema = Joi.object({
    party_type: Joi.string()
        .valid(...PARTY_TYPES)
        .optional(),
    is_active: Joi.boolean().optional(),
}).min(1);
export const listProjectContractorsQuerySchema = Joi.object({
    includeInactive: Joi.boolean().default(false),
});
export const createClientContactSchema = Joi.object({
    name: Joi.string().trim().min(1).max(500).required(),
    email: Joi.string().email().required(),
    title: Joi.string().trim().max(500).allow(null, "").optional(),
    receives_reports: Joi.boolean().default(true),
});
export const clientContactParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    contactId: Joi.string().uuid().required(),
});
export const customMilestoneProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const customMilestoneParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    milestoneId: Joi.string().uuid().required(),
});
export const createCustomMilestoneSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).allow(null).optional(),
    title: Joi.string().trim().min(1).max(500).required(),
    planned_date: Joi.string().isoDate().required(),
    forecast_date: Joi.string().isoDate().allow(null).optional(),
    actual_date: Joi.string().isoDate().allow(null).optional(),
    notes: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const updateCustomMilestoneSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).allow(null).optional(),
    title: Joi.string().trim().min(1).max(500).optional(),
    planned_date: Joi.string().isoDate().optional(),
    forecast_date: Joi.string().isoDate().allow(null).optional(),
    actual_date: Joi.string().isoDate().allow(null).optional(),
    notes: Joi.string().trim().max(10000).allow(null, "").optional(),
}).min(1);
export const listCustomMilestonesQuerySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    includeRemoved: Joi.boolean().default(false),
    aggregate: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});
export const scheduleProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
});
export const listScheduleTasksQuerySchema = Joi.object({
    version_id: Joi.string().uuid().optional(),
});
export const scheduleVersionParamsSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    versionId: Joi.string().uuid().required(),
});
/** AC-SCH-01/02. `file` is the .mpp as base64 or a data URI; size and type are checked
 *  against the bytes in utils/objectStorage.ts, not here. `rebaseline: true` is what makes
 *  an upload a rebaseline; `change_request_id` is an optional link to a CR, not a requirement. */
export const uploadScheduleSchema = Joi.object({
    file: Joi.string().required(),
    filename: Joi.string().max(500).required(),
    scope_mode: Joi.string()
        .valid("milestones_only", "current_stage", "every_task")
        .default("every_task"),
    rebaseline: Joi.boolean().default(false),
    change_request_id: Joi.string().uuid().allow(null).optional(),
    notes: Joi.string().max(2000).allow("", null).optional(),
});
export const listReconciliationFlagsQuerySchema = Joi.object({
    includeAcknowledged: Joi.boolean().default(false),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
});
export const acknowledgeReconciliationFlagsSchema = Joi.object({
    flag_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
});
const DPR_STATUSES = ["draft", "submitted"];
const DPR_EFFECTS_SEVERITIES = [
    "none",
    "minor",
    "significant",
    "stoppage",
];
const DPR_PROGRESS_SOURCES = [
    "schedule_task",
    "free_text",
];
export const dprIdParamSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    dprId: Joi.string().uuid().required(),
});
export const dprAmendmentIdParamSchema = Joi.object({
    projectId: Joi.string().uuid().required(),
    amendmentId: Joi.string().uuid().required(),
});
export const createDprSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    report_date: Joi.string().isoDate().required(),
    site_location: Joi.string().trim().min(1).max(500).required(),
    contract_no: Joi.string().trim().max(100).allow(null, "").optional(),
    weather_category_id: Joi.number().integer().allow(null).optional(),
    temp_min_c: Joi.number().min(-50).max(60).allow(null).optional(),
    temp_max_c: Joi.number().min(-50).max(60).allow(null).optional(),
    humidity_pct: Joi.number().integer().min(0).max(100).allow(null).optional(),
    wind: Joi.string().trim().max(100).allow(null, "").optional(),
    effects_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    effects_severity: Joi.string()
        .valid(...DPR_EFFECTS_SEVERITIES)
        .default("none"),
    equipment_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    visitors_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    delays_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    incidents_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    materials_rejected_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    other_notes_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    status: Joi.string()
        .valid(...DPR_STATUSES)
        .default("draft"),
    work_items: Joi.array()
        .items(Joi.object({
        work_item_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        work_area: Joi.string().trim().min(1).max(500).required(),
        work_carried_out: Joi.string().trim().min(1).max(10000).required(),
    }))
        .optional(),
    activity_progress: Joi.array()
        .items(Joi.object({
        dpr_activity_progress_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        source: Joi.string()
            .valid(...DPR_PROGRESS_SOURCES)
            .required(),
        task_id: Joi.string().uuid().allow(null).optional(),
        free_text: Joi.string().trim().max(10000).allow(null).optional(),
        today_pct: Joi.number().min(0).max(100).required(),
        total_pct: Joi.number().min(0).max(100).required(),
    }))
        .optional(),
    personnel_groups: Joi.array()
        .items(Joi.object({
        personnel_group_id: Joi.string().uuid().optional(),
        project_contractor_id: Joi.string().uuid().required(),
        sort_order: Joi.number().integer().min(0).optional(),
        total_headcount: Joi.number().integer().min(0).required(),
        role_counts: Joi.array()
            .items(Joi.object({
            personnel_role_id: Joi.number().integer().required(),
            headcount: Joi.number().integer().min(1).required(),
        }))
            .optional(),
    }))
        .optional(),
    photos: Joi.array()
        .items(Joi.object({
        photo_id: Joi.string().uuid().optional(),
        file_id: Joi.string().uuid().required(),
        caption: Joi.string().trim().max(1000).allow(null, "").optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        taken_at: Joi.string().isoDate().allow(null).optional(),
        gps_lat: Joi.number().min(-90).max(90).allow(null).optional(),
        gps_lng: Joi.number().min(-180).max(180).allow(null).optional(),
    }))
        .max(20)
        .optional(),
});
export const updateDprSchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    report_date: Joi.string().isoDate().optional(),
    site_location: Joi.string().trim().min(1).max(500).optional(),
    contract_no: Joi.string().trim().max(100).allow(null, "").optional(),
    weather_category_id: Joi.number().integer().allow(null).optional(),
    temp_min_c: Joi.number().min(-50).max(60).allow(null).optional(),
    temp_max_c: Joi.number().min(-50).max(60).allow(null).optional(),
    humidity_pct: Joi.number().integer().min(0).max(100).allow(null).optional(),
    wind: Joi.string().trim().max(100).allow(null, "").optional(),
    effects_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    effects_severity: Joi.string()
        .valid(...DPR_EFFECTS_SEVERITIES)
        .optional(),
    equipment_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    visitors_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    delays_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    incidents_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    materials_rejected_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    other_notes_text: Joi.string().trim().max(10000).allow(null, "").optional(),
    work_items: Joi.array()
        .items(Joi.object({
        work_item_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        work_area: Joi.string().trim().min(1).max(500).required(),
        work_carried_out: Joi.string().trim().min(1).max(10000).required(),
    }))
        .optional(),
    activity_progress: Joi.array()
        .items(Joi.object({
        dpr_activity_progress_id: Joi.string().uuid().optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        source: Joi.string()
            .valid(...DPR_PROGRESS_SOURCES)
            .required(),
        task_id: Joi.string().uuid().allow(null).optional(),
        free_text: Joi.string().trim().max(10000).allow(null).optional(),
        today_pct: Joi.number().min(0).max(100).required(),
        total_pct: Joi.number().min(0).max(100).required(),
    }))
        .optional(),
    personnel_groups: Joi.array()
        .items(Joi.object({
        personnel_group_id: Joi.string().uuid().optional(),
        project_contractor_id: Joi.string().uuid().required(),
        sort_order: Joi.number().integer().min(0).optional(),
        total_headcount: Joi.number().integer().min(0).required(),
        role_counts: Joi.array()
            .items(Joi.object({
            personnel_role_id: Joi.number().integer().required(),
            headcount: Joi.number().integer().min(1).required(),
        }))
            .optional(),
    }))
        .optional(),
    photos: Joi.array()
        .items(Joi.object({
        photo_id: Joi.string().uuid().optional(),
        file_id: Joi.string().uuid().required(),
        caption: Joi.string().trim().max(1000).allow(null, "").optional(),
        sort_order: Joi.number().integer().min(0).optional(),
        taken_at: Joi.string().isoDate().allow(null).optional(),
        gps_lat: Joi.number().min(-90).max(90).allow(null).optional(),
        gps_lng: Joi.number().min(-180).max(180).allow(null).optional(),
    }))
        .max(20)
        .optional(),
}).min(1);
export const uploadDprPhotoSchema = Joi.object({
    file: Joi.string().required(),
    filename: Joi.string().trim().max(500).required(),
    caption: Joi.string().trim().max(1000).allow(null, "").optional(),
});
export const listDprsQuerySchema = Joi.object({
    stage_no: Joi.number().integer().min(1).max(10).optional(),
    status: Joi.string()
        .valid(...DPR_STATUSES)
        .optional(),
    from_date: Joi.string().isoDate().optional(),
    to_date: Joi.string().isoDate().optional(),
    author_id: Joi.string().uuid().optional(),
    page: Joi.number().integer().min(1).default(1),
    // The DPR list view pages DPRs and missed dates together, and missed dates only exist
    // client-side, so the merge needs the project's whole DPR list in one request. A daily
    // report per working day is ~250 a year, so 1000 covers a multi-year project.
    // shortcut: projects past 1000 DPRs lose their oldest rows, move the merge server-side then.
    limit: Joi.number().integer().min(1).max(1000).default(25),
});
export const expectedDprDaysQuerySchema = Joi.object({
    from: Joi.string().isoDate().required(),
    to: Joi.string().isoDate().required(),
});
export const createDprAmendmentSchema = Joi.object({
    reason: Joi.string().trim().min(1).max(10000).required(),
    proposed_document: createDprSchema.required(),
});
export const decideDprAmendmentSchema = Joi.object({
    decision: Joi.string().valid("approve", "reject").required(),
    decision_note: Joi.when("decision", {
        is: "reject",
        then: Joi.string().trim().min(1).max(10000).required(),
        otherwise: Joi.string().trim().max(10000).optional().allow(""),
    }),
});
export const listDprAmendmentsQuerySchema = Joi.object({
    status: Joi.string().valid("pending", "approved", "rejected", "withdrawn").optional(),
});
export const escalationProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().optional(),
});
export const escalationParamsSchema = Joi.object({
    projectId: Joi.string().uuid().optional(),
    escalationId: Joi.string().uuid().required(),
});
export const createEscalationSchema = Joi.object({
    submission_id: Joi.string().uuid().required(),
    status: Joi.string()
        .valid("open", "acknowledged", "resolved", "voided")
        .default("open"),
    note: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const updateEscalationSchema = Joi.object({
    status: Joi.string()
        .valid("open", "acknowledged", "resolved", "voided")
        .optional(),
    note: Joi.string().trim().max(10000).allow(null, "").optional(),
}).min(1);
export const acknowledgeEscalationSchema = Joi.object({
    note: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const resolveEscalationSchema = Joi.object({
    note: Joi.string().trim().max(10000).allow(null, "").optional(),
});
export const createEscalationResponseSchema = Joi.object({
    body: Joi.string().trim().min(1).max(10000).required(),
    is_acknowledgement: Joi.boolean().default(false),
});
export const listEscalationsQuerySchema = Joi.object({
    status: Joi.string()
        .valid("open", "acknowledged", "resolved", "voided")
        .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
const isMondayValidator = (value, helpers) => {
    const parts = value.split("-");
    if (parts.length !== 3) {
        return helpers.error("any.invalid");
    }
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    const utcDate = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(utcDate.getTime())) {
        return helpers.error("any.invalid");
    }
    if (utcDate.getUTCDay() !== 1) {
        return helpers.message({
            custom: "week_start must be a Monday (day of week 1)",
        });
    }
    return value;
};
export const weeklySubmissionProjectParamsSchema = Joi.object({
    projectId: Joi.string().uuid().optional(),
});
export const weeklySubmissionParamsSchema = Joi.object({
    projectId: Joi.string().uuid().optional(),
    submissionId: Joi.string().uuid().required(),
});
export const weeklySubmissionAddressedRiskParamsSchema = Joi.object({
    projectId: Joi.string().uuid().optional(),
    submissionId: Joi.string().uuid().required(),
    riskId: Joi.string().uuid().required(),
});
export const createWeeklySubmissionSchema = Joi.object({
    week_start: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .custom(isMondayValidator)
        .required(),
    active_stages: Joi.array()
        .items(Joi.number().integer().min(1).max(30))
        .optional(),
    scope_change_text: Joi.string().trim().max(2000).default("No scope change"),
    top_risk_id: Joi.string().uuid().allow(null).optional(),
    top_risk_text: Joi.string().trim().max(1000).allow(null, "").optional(),
    top_action: Joi.string().trim().max(2000).allow(null, "").optional(),
    pm_commentary: Joi.string().trim().max(10000).allow(null, "").optional(),
    exco_decision_needed: Joi.string()
        .trim()
        .max(2000)
        .allow(null, "")
        .optional(),
    escalate: Joi.boolean().default(false),
    escalation_reason: Joi.string()
        .trim()
        .max(10000)
        .allow(null, "")
        .when("escalate", {
        is: true,
        then: Joi.string().trim().min(1).required(),
        otherwise: Joi.optional(),
    }),
    addressed_risks: Joi.array()
        .items(Joi.object({
        risk_id: Joi.string().uuid().required(),
        method: Joi.string()
            .valid("top_risk", "top_action", "commentary", "dismissed")
            .required(),
        dismissal_reason: Joi.string()
            .trim()
            .max(1000)
            .allow(null, "")
            .optional(),
    }))
        .optional(),
});
export const updateWeeklySubmissionSchema = Joi.object({
    active_stages: Joi.array()
        .items(Joi.number().integer().min(1).max(30))
        .optional(),
    scope_change_text: Joi.string().trim().max(2000).optional(),
    top_risk_id: Joi.string().uuid().allow(null).optional(),
    top_risk_text: Joi.string().trim().max(1000).allow(null, "").optional(),
    top_action: Joi.string().trim().max(2000).allow(null, "").optional(),
    pm_commentary: Joi.string().trim().max(10000).allow(null, "").optional(),
    exco_decision_needed: Joi.string()
        .trim()
        .max(2000)
        .allow(null, "")
        .optional(),
    escalate: Joi.boolean().optional(),
    escalation_reason: Joi.string()
        .trim()
        .max(10000)
        .allow(null, "")
        .optional(),
    addressed_risks: Joi.array()
        .items(Joi.object({
        risk_id: Joi.string().uuid().required(),
        method: Joi.string()
            .valid("top_risk", "top_action", "commentary", "dismissed")
            .required(),
        dismissal_reason: Joi.string()
            .trim()
            .max(1000)
            .allow(null, "")
            .optional(),
    }))
        .optional(),
    updated_at: Joi.string().isoDate().optional(),
}).min(1);
export const approveWeeklySubmissionSchema = Joi.object({
    updated_at: Joi.string().isoDate().optional(),
    schedule_version_id: Joi.string().uuid().allow(null).optional(),
});
export const supersedeWeeklySubmissionSchema = Joi.object({
    supersede_reason: Joi.string().trim().min(1).max(10000).required(),
});
export const addSubmissionAddressedRiskSchema = Joi.object({
    risk_id: Joi.string().uuid().required(),
    method: Joi.string()
        .valid("top_risk", "top_action", "commentary", "dismissed")
        .required(),
    dismissal_reason: Joi.string().trim().max(1000).allow(null, "").optional(),
});
export const listWeeklySubmissionsQuerySchema = Joi.object({
    status: Joi.string().valid("draft", "approved", "superseded").optional(),
    week_start: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
});
export const setSubmissionClientPhotosSchema = Joi.object({
    photo_ids: Joi.array().items(Joi.string().uuid()).required(),
});
export const searchQuerySchema = Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    limit: Joi.number().integer().min(1).max(10).default(5),
});
