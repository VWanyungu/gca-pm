import type { Knex } from 'knex';
import { randomUUID } from 'crypto';
import db from '../dbSetup.js';

export interface Paginated<T> {
  users: T[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface UserListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string | null;
  is_verified: boolean;
  created_at: Date;
}

export interface UserAuthView {
  userId: string | null;
  email: string | null;
  passwordHash: string | null;
}

export interface CreateUserInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  username: string;
  isVerified?: boolean;
}

export interface UpdatePasswordInput {
  userId: string;
  passwordHash: string;
}

export class Users {
  static async getAllUsers({
    page = 1,
    limit = 10,
  }: { page?: number; limit?: number }): Promise<Paginated<UserListItem>> {
    const offset = (page - 1) * limit;
    const users = await db<UserListItem>('users')
      .select('id', 'first_name', 'last_name', 'email', 'username', 'is_verified', 'created_at')
      .limit(limit)
      .offset(offset)
      .orderBy('id');

    const [row] = await db('users').count<{ total: string }[]>('* as total');
    const total = Number(row?.total ?? 0);

    return {
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getSingleUserByEmail(email: string): Promise<UserAuthView> {
    const [user] = await db('users')
      .select<{ id: string; email: string; password_hash: string }[]>(
        'id',
        'email',
        'password_hash',
      )
      .where('email', email);

    if (!user) return { userId: null, email: null, passwordHash: null };

    return { userId: user.id, email: user.email, passwordHash: user.password_hash };
  }

  static async createUser(input: CreateUserInput): Promise<{ userId: string; email: string }> {
    const [user] = await db('users')
      .insert({
        id: input.id,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        password_hash: input.passwordHash,
        username: input.username,
        is_verified: input.isVerified ?? false,
      })
      .returning<{ id: string; email: string }[]>(['id', 'email']);

    if (!user) throw new Error('Failed to create user');
    return { userId: user.id, email: user.email };
  }

  static async updateUserPassword(
    input: UpdatePasswordInput,
  ): Promise<{ status: 'success' | 'fail'; error: string | null }> {
    try {
      const affected = await db('users')
        .where('id', input.userId)
        .update({ password_hash: input.passwordHash });

      if (affected === 0) return { status: 'fail', error: 'User not found' };
      return { status: 'success', error: null };
    } catch (err) {
      return { status: 'fail', error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

export class Tokens {
  static async getRefreshToken(token: string): Promise<{ refreshToken: string | null }> {
    const [row] = await db('refreshTokens').select('refresh_token').where('refresh_token', token);
    return { refreshToken: row ? row.refresh_token : null };
  }

  static async storeRefreshToken(userId: string, token: string): Promise<void> {
    await db('refreshTokens').insert({ user_id: userId, refresh_token: token });
  }

  static async deleteRefreshToken(token: string): Promise<{ deletedToken: string | null }> {
    const [deleted] = await db('refreshTokens')
      .where('refresh_token', token)
      .del()
      .returning<{ refresh_token: string }[]>('refresh_token');
    return { deletedToken: deleted ? deleted.refresh_token : null };
  }

  static async blacklistToken(token: string): Promise<void> {
    await db('tokens').insert({ token }).onConflict('token').ignore();
  }

  static async checkBlacklistToken(token: string): Promise<boolean> {
    const row = await db('tokens').select('id').where('token', token).first();
    return !!row;
  }
}

export type RoleName = 'PM' | 'Planner' | 'SiteEngineer' | 'ExCo' | 'Admin' | 'ProjectCreator';
export type ScopeType = 'global' | 'program' | 'project';
export interface RoleGrant {
  role: RoleName;
  scope_type: ScopeType;
  program_id: string | null;
  project_id: string | null;
}

export interface RoleGrantRow extends RoleGrant {
  attribute_id: string;
  user_id: string;
  granted_by: string;
  granted_at: Date;
}

export interface GrantInput {
  attribute_id: string;
  user_id: string;
  role: RoleName;
  scope_type: ScopeType;
  program_id: number | null;
  project_id: string | null;
  granted_by: string;
}

export class Roles {
  static async getRoles(userId: string): Promise<RoleGrant[]> {
    const rows = await db('roles')
      .select('role', 'scope_type', 'program_id', 'project_id')
      .where({ user_id: userId })
      .whereNull('revoked_at');
    return rows;
  }

  static async grant(input: GrantInput): Promise<string> {
    const [row] = await db('roles').insert(input).returning('attribute_id');
    return row.attribute_id;
  }

  static async revoke(attributeId: string, revokedBy: string, reason: string | null): Promise<RoleGrantRow | null> {
    const [row] = await db('roles')
      .where({ attribute_id: attributeId })
      .whereNull('revoked_at')
      .update({ revoked_by: revokedBy, revoked_at: db.fn.now(), revoke_reason: reason })
      .returning(['attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at']);
    return row ?? null;
  }

  static async list({
    userId,
    page = 1,
    limit = 10,
  }: { userId?: string; page?: number; limit?: number }): Promise<{
    roles: RoleGrantRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('roles').whereNull('revoked_at');
    if (userId) base.where({ user_id: userId });

    const countRows = await base.clone().count<{ count: string }[]>('attribute_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const roles = await base
      .clone()
      .select('attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at')
      .orderBy('granted_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { roles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getById(attributeId: string): Promise<RoleGrantRow | null> {
    const row = await db('roles')
      .select('attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at')
      .where({ attribute_id: attributeId })
      .whereNull('revoked_at')
      .first();
    return row ?? null;
  }
}

export interface RiskCategoryRow {
  risk_category_id: number;
  code: string;
  name: string;
  is_system: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface RiskCategoryCreateInput {
  code: string;
  name: string;
  sort_order: number;
  is_active?: boolean;
}

export interface RiskCategoryUpdateInput {
  code?: string;
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export class RiskCategories {
  static async list({
    includeInactive = false,
    page = 1,
    limit = 50,
  }: { includeInactive?: boolean; page?: number; limit?: number }): Promise<{
    categories: RiskCategoryRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('risk_category');
    if (!includeInactive) base.where({ is_active: true });

    const countRows = await base.clone().count<{ count: string }[]>('risk_category_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const categories = await base
      .clone()
      .select('risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active')
      .orderBy('sort_order', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getById(id: number): Promise<RiskCategoryRow | null> {
    const row = await db('risk_category').where({ risk_category_id: id }).first();
    return row ?? null;
  }

  static async getByCode(code: string): Promise<RiskCategoryRow | null> {
    const row = await db('risk_category').where({ code }).first();
    return row ?? null;
  }

  static async create(input: RiskCategoryCreateInput): Promise<RiskCategoryRow> {
    const [row] = await db('risk_category')
      .insert({ ...input, is_active: input.is_active ?? true })
      .returning(['risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active']);
    return row;
  }

  static async update(id: number, input: RiskCategoryUpdateInput): Promise<RiskCategoryRow | null> {
    const [row] = await db('risk_category')
      .where({ risk_category_id: id })
      .update(input)
      .returning(['risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active']);
    return row ?? null;
  }

  static async deactivate(id: number): Promise<RiskCategoryRow | null> {
    const [row] = await db('risk_category')
      .where({ risk_category_id: id })
      .update({ is_active: false })
      .returning(['risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active']);
    return row ?? null;
  }
}

export interface ProgramRow {
  program_id: number;
  name: string;
  is_active: boolean;
}

export class Programs {
  static async list({
    includeInactive = false,
    page = 1,
    limit = 50,
  }: { includeInactive?: boolean; page?: number; limit?: number }): Promise<{
    programs: ProgramRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('programs');
    if (!includeInactive) base.where({ is_active: true });

    const countRows = await base.clone().count<{ count: string }[]>('program_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const programs = await base
      .clone()
      .select('program_id', 'name', 'is_active')
      .orderBy('program_id', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { programs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getById(id: number): Promise<ProgramRow | null> {
    const row = await db('programs').where({ program_id: id }).first();
    return row ?? null;
  }

  static async getByName(name: string): Promise<ProgramRow | null> {
    const row = await db('programs').where({ name }).first();
    return row ?? null;
  }

  static async create(input: { name: string; is_active?: boolean }): Promise<ProgramRow> {
    const [row] = await db('programs')
      .insert({ name: input.name, is_active: input.is_active ?? true })
      .returning(['program_id', 'name', 'is_active']);
    return row;
  }

  static async update(id: number, input: { name?: string; is_active?: boolean }): Promise<ProgramRow | null> {
    const [row] = await db('programs')
      .where({ program_id: id })
      .update(input)
      .returning(['program_id', 'name', 'is_active']);
    return row ?? null;
  }

  static async deactivate(id: number): Promise<ProgramRow | null> {
    const [row] = await db('programs')
      .where({ program_id: id })
      .update({ is_active: false })
      .returning(['program_id', 'name', 'is_active']);
    return row ?? null;
  }
}

export interface WeatherCategoryRow {
  weather_category_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export class WeatherCategories {
  static async list({
    includeInactive = false,
    page = 1,
    limit = 50,
  }: { includeInactive?: boolean; page?: number; limit?: number }): Promise<{
    categories: WeatherCategoryRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('weather_category');
    if (!includeInactive) base.where({ is_active: true });

    const countRows = await base.clone().count<{ count: string }[]>('weather_category_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const categories = await base
      .clone()
      .select('weather_category_id', 'name', 'sort_order', 'is_active')
      .orderBy('sort_order', 'asc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getById(id: number): Promise<WeatherCategoryRow | null> {
    const row = await db('weather_category').where({ weather_category_id: id }).first();
    return row ?? null;
  }

  static async getByName(name: string): Promise<WeatherCategoryRow | null> {
    const row = await db('weather_category').where({ name }).first();
    return row ?? null;
  }

  static async create(input: { name: string; sort_order: number; is_active?: boolean }): Promise<WeatherCategoryRow> {
    const [row] = await db('weather_category')
      .insert({ ...input, is_active: input.is_active ?? true })
      .returning(['weather_category_id', 'name', 'sort_order', 'is_active']);
    return row;
  }

  static async update(id: number, input: { name?: string; sort_order?: number; is_active?: boolean }): Promise<WeatherCategoryRow | null> {
    const [row] = await db('weather_category')
      .where({ weather_category_id: id })
      .update(input)
      .returning(['weather_category_id', 'name', 'sort_order', 'is_active']);
    return row ?? null;
  }

  static async deactivate(id: number): Promise<WeatherCategoryRow | null> {
    const [row] = await db('weather_category')
      .where({ weather_category_id: id })
      .update({ is_active: false })
      .returning(['weather_category_id', 'name', 'sort_order', 'is_active']);
    return row ?? null;
  }
}

export type RiskStatus = 'open' | 'mitigated' | 'closed' | 'dismissed' | 'auto_resolved';
export type RiskKind = 'risk' | 'issue';
export type RiskSource = 'manual' | 'auto_overdue_task';

export interface RiskIssueRow {
  risk_id: string;
  project_id: string;
  stage_no: number | null;
  title: string;
  description: string | null;
  category_id: number;
  likelihood: number | null;
  impact: number;
  score: number;
  owner_id: string;
  mitigation: string | null;
  status: RiskStatus;
  addressed_at: Date | null;
  addressed_submission_id: string | null;
  dismissal_reason: string | null;
  auto_resolution_reason: string | null;
  source: RiskSource;
  source_task_id: string | null;
  source_schedule_version_id: string | null;
  kind: RiskKind;
  realised_at: Date | null;
  realised_by: string | null;
  opened_at: Date;
  closed_at: Date | null;
  created_by: string;
  updated_at: Date;
}

export interface RiskIssueCreateInput {
  risk_id: string;
  project_id: string;
  stage_no: number | null;
  title: string;
  description: string | null;
  category_id: number;
  likelihood: number | null;
  impact: number;
  owner_id: string;
  mitigation: string | null;
  status: RiskStatus;
  source: RiskSource;
  kind: RiskKind;
  realised_at: Date | null;
  realised_by: string | null;
  created_by: string;
}

export interface RiskIssueUpdateFields {
  title?: string;
  description?: string | null;
  category_id?: number;
  stage_no?: number | null;
  likelihood?: number | null;
  impact?: number;
  owner_id?: string;
  mitigation?: string | null;
  status?: RiskStatus;
  dismissal_reason?: string | null;
  closed_at?: Date | null;
  kind?: RiskKind;
  realised_at?: Date | null;
  realised_by?: string | null;
}

const RISK_COLS = [
  'risk_id', 'project_id', 'stage_no', 'title', 'description', 'category_id',
  'likelihood', 'impact', 'score', 'owner_id', 'mitigation', 'status',
  'addressed_at', 'addressed_submission_id', 'dismissal_reason', 'auto_resolution_reason',
  'source', 'source_task_id', 'source_schedule_version_id',
  'kind', 'realised_at', 'realised_by',
  'opened_at', 'closed_at', 'created_by', 'updated_at',
];

export class RiskIssues {
  static async create(input: RiskIssueCreateInput): Promise<RiskIssueRow> {
    const [row] = await db('risk').insert(input).returning(RISK_COLS);
    return row;
  }

  static async list({
    projectId,
    status,
    kind,
    page = 1,
    limit = 25,
  }: { projectId: string; status?: RiskStatus; kind?: RiskKind; page?: number; limit?: number }): Promise<{
    riskIssues: RiskIssueRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('risk').where({ project_id: projectId });
    if (status) base.andWhere({ status });
    if (kind) base.andWhere({ kind });

    const countRows = await base.clone().count<{ count: string }[]>('risk_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const riskIssues = await base
      .clone()
      .select(RISK_COLS)
      .orderBy('opened_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return { riskIssues, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  static async getById(projectId: string, riskId: string): Promise<RiskIssueRow | null> {
    const row = await db('risk').where({ project_id: projectId, risk_id: riskId }).first();
    return row ?? null;
  }

  static async update(projectId: string, riskId: string, patch: RiskIssueUpdateFields): Promise<RiskIssueRow | null> {
    const [row] = await db('risk')
      .where({ project_id: projectId, risk_id: riskId })
      .update(patch)
      .returning(RISK_COLS);
    return row ?? null;
  }
}

export type StageEvent =
  | 'added_to_scope'
  | 'removed_from_scope'
  | 'activated'
  | 'deactivated'
  | 'completed'
  | 'reopened';

export type StageState = 'not_started' | 'active' | 'inactive' | 'complete';

export interface StageStateHistoryRow {
  event_id: string;
  project_id: string;
  stage_no: number;
  event: StageEvent;
  from_state: StageState | null;
  to_state: StageState;
  reason: string | null;
  checklist_snapshot: Record<string, unknown> | null;
  closure_notes: string | null;
  actor_id: string;
  occurred_at: Date;
  submission_id: string | null;
}

export interface CreateStageStateHistoryInput {
  event_id: string;
  project_id: string;
  stage_no: number;
  event: StageEvent;
  from_state?: StageState | null;
  to_state: StageState;
  reason?: string | null;
  checklist_snapshot?: Record<string, unknown> | null;
  closure_notes?: string | null;
  actor_id: string;
  occurred_at?: Date;
  submission_id?: string | null;
}

export interface UpdateStageStateHistoryFields {
  reason?: string | null;
  checklist_snapshot?: Record<string, unknown> | null;
  closure_notes?: string | null;
  submission_id?: string | null;
  from_state?: StageState | null;
  to_state?: StageState;
}

const STAGE_STATE_HISTORY_COLS = [
  'event_id',
  'project_id',
  'stage_no',
  'event',
  'from_state',
  'to_state',
  'reason',
  'checklist_snapshot',
  'closure_notes',
  'actor_id',
  'occurred_at',
  'submission_id',
];

export class StageStateHistory {
  static async create(
    input: CreateStageStateHistoryInput,
    trx?: Knex.Transaction,
  ): Promise<StageStateHistoryRow> {
    const q = trx ? trx('stage_state_history') : db('stage_state_history');
    const [row] = await q.insert(input).returning(STAGE_STATE_HISTORY_COLS);
    return row;
  }

  static async list({
    projectId,
    stageNo,
    event,
    page = 1,
    limit = 25,
  }: {
    projectId: string;
    stageNo?: number;
    event?: StageEvent;
    page?: number;
    limit?: number;
  }): Promise<{
    stageStateHistory: StageStateHistoryRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('stage_state_history').where({ project_id: projectId });
    if (stageNo !== undefined) base.andWhere({ stage_no: stageNo });
    if (event) base.andWhere({ event });

    const countRows = await base.clone().count<{ count: string }[]>('event_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const stageStateHistory = await base
      .clone()
      .select(STAGE_STATE_HISTORY_COLS)
      .orderBy('occurred_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      stageStateHistory,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getById(
    projectId: string,
    eventId: string,
  ): Promise<StageStateHistoryRow | null> {
    const row = await db('stage_state_history')
      .where({ project_id: projectId, event_id: eventId })
      .first();
    return row ?? null;
  }

  static async update(
    projectId: string,
    eventId: string,
    patch: UpdateStageStateHistoryFields,
    trx?: Knex.Transaction,
  ): Promise<StageStateHistoryRow | null> {
    const q = trx ? trx('stage_state_history') : db('stage_state_history');
    const [row] = await q
      .where({ project_id: projectId, event_id: eventId })
      .update(patch)
      .returning(STAGE_STATE_HISTORY_COLS);
    return row ?? null;
  }

  static async delete(
    projectId: string,
    eventId: string,
    trx?: Knex.Transaction,
  ): Promise<StageStateHistoryRow | null> {
    const q = trx ? trx('stage_state_history') : db('stage_state_history');
    const [row] = await q
      .where({ project_id: projectId, event_id: eventId })
      .del()
      .returning(STAGE_STATE_HISTORY_COLS);
    return row ?? null;
  }

  static async recordTransition({
    projectId,
    stageNo,
    event,
    fromState,
    toState,
    reason,
    checklistSnapshot,
    closureNotes,
    actorId,
    submissionId,
    updateProjectStage = true,
  }: {
    projectId: string;
    stageNo: number;
    event: StageEvent;
    fromState: StageState | null;
    toState: StageState;
    reason?: string | null;
    checklistSnapshot?: Record<string, unknown> | null;
    closureNotes?: string | null;
    actorId: string;
    submissionId?: string | null;
    updateProjectStage?: boolean;
  }): Promise<StageStateHistoryRow> {
    return await db.transaction(async (trx) => {
      if (updateProjectStage) {
        const existing = await trx('project_stage')
          .where({ project_id: projectId, stage_no: stageNo })
          .first();

        if (!existing) {
          await trx('project_stage').insert({
            project_id: projectId,
            stage_no: stageNo,
            in_scope: true,
            state: toState,
            added_to_scope_by: actorId,
            added_to_scope_at: trx.fn.now(),
            last_changed_by: actorId,
            last_changed_at: trx.fn.now(),
          });
        } else {
          const patch: Record<string, unknown> = {
            state: toState,
            last_changed_by: actorId,
            last_changed_at: trx.fn.now(),
          };
          if (event === 'added_to_scope') {
            patch.in_scope = true;
          } else if (event === 'removed_from_scope') {
            patch.in_scope = false;
          }
          await trx('project_stage')
            .where({ project_id: projectId, stage_no: stageNo })
            .update(patch);
        }
      }

      const [created] = await trx('stage_state_history')
        .insert({
          event_id: randomUUID(),
          project_id: projectId,
          stage_no: stageNo,
          event,
          from_state: fromState,
          to_state: toState,
          reason: reason ?? null,
          checklist_snapshot: checklistSnapshot ?? null,
          closure_notes: closureNotes ?? null,
          actor_id: actorId,
          submission_id: submissionId ?? null,
          occurred_at: new Date(),
        })
        .returning(STAGE_STATE_HISTORY_COLS);

      return created;
    });
  }
}

export interface ProjectStageRow {
  project_id: string;
  stage_no: number;
  in_scope: boolean;
  state: StageState;
  added_to_scope_by: string;
  added_to_scope_at: Date;
  last_changed_by: string;
  last_changed_at: Date;
}

const PROJECT_STAGE_COLS = [
  'project_id',
  'stage_no',
  'in_scope',
  'state',
  'added_to_scope_by',
  'added_to_scope_at',
  'last_changed_by',
  'last_changed_at',
];

export interface ProjectStageWithDetailsRow extends ProjectStageRow {
  stage_name: string;
  phase_id: number;
}

export class ProjectStages {
  static async get(
    projectId: string,
    stageNo: number,
    trx?: Knex.Transaction,
  ): Promise<ProjectStageWithDetailsRow | null> {
    const q = trx ? trx('project_stage') : db('project_stage');
    const row = await q
      .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
      .where({ 'project_stage.project_id': projectId, 'project_stage.stage_no': stageNo })
      .select(
        'project_stage.project_id',
        'project_stage.stage_no',
        'pdm_stage.name as stage_name',
        'pdm_stage.phase_id',
        'project_stage.in_scope',
        'project_stage.state',
        'project_stage.added_to_scope_by',
        'project_stage.added_to_scope_at',
        'project_stage.last_changed_by',
        'project_stage.last_changed_at',
      )
      .first();
    return row ?? null;
  }

  static async list({
    projectId,
    inScope,
    state,
  }: {
    projectId: string;
    inScope?: boolean;
    state?: StageState;
  }): Promise<ProjectStageWithDetailsRow[]> {
    const query = db('project_stage')
      .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
      .where('project_stage.project_id', projectId)
      .select(
        'project_stage.project_id',
        'project_stage.stage_no',
        'pdm_stage.name as stage_name',
        'pdm_stage.phase_id',
        'project_stage.in_scope',
        'project_stage.state',
        'project_stage.added_to_scope_by',
        'project_stage.added_to_scope_at',
        'project_stage.last_changed_by',
        'project_stage.last_changed_at',
      )
      .orderBy('project_stage.stage_no', 'asc');

    if (inScope !== undefined) {
      query.andWhere('project_stage.in_scope', inScope);
    }
    if (state !== undefined) {
      query.andWhere('project_stage.state', state);
    }

    return await query;
  }

  static async create({
    projectId,
    stageNo,
    inScope = true,
    state = 'not_started',
    actorId,
    reason,
  }: {
    projectId: string;
    stageNo: number;
    inScope?: boolean;
    state?: StageState;
    actorId: string;
    reason?: string | null;
  }): Promise<ProjectStageWithDetailsRow> {
    return await db.transaction(async (trx) => {
      const [stageRow] = await trx('project_stage')
        .insert({
          project_id: projectId,
          stage_no: stageNo,
          in_scope: inScope,
          state,
          added_to_scope_by: actorId,
          added_to_scope_at: trx.fn.now(),
          last_changed_by: actorId,
          last_changed_at: trx.fn.now(),
        })
        .returning(PROJECT_STAGE_COLS);

      await trx('stage_state_history').insert({
        event_id: randomUUID(),
        project_id: projectId,
        stage_no: stageNo,
        event: 'added_to_scope',
        from_state: null,
        to_state: state,
        reason: reason ?? null,
        checklist_snapshot: null,
        closure_notes: null,
        actor_id: actorId,
        occurred_at: new Date(),
      });

      const pdmStage = await trx('pdm_stage').where({ stage_no: stageNo }).first();

      return {
        ...stageRow,
        stage_name: pdmStage?.name ?? '',
        phase_id: pdmStage?.phase_id ?? 1,
      };
    });
  }

  static async update(
    projectId: string,
    stageNo: number,
    patch: {
      state?: StageState;
      in_scope?: boolean;
      last_changed_by: string;
    },
    trx?: Knex.Transaction,
  ): Promise<ProjectStageRow | null> {
    const q = trx ? trx('project_stage') : db('project_stage');
    const [row] = await q
      .where({ project_id: projectId, stage_no: stageNo })
      .update({
        ...patch,
        last_changed_at: db.fn.now(),
      })
      .returning(PROJECT_STAGE_COLS);
    return row ?? null;
  }

  static async transition({
    projectId,
    stageNo,
    toState,
    inScope,
    actorId,
    reason,
    checklistSnapshot,
    closureNotes,
  }: {
    projectId: string;
    stageNo: number;
    toState?: StageState;
    inScope?: boolean;
    actorId: string;
    reason?: string | null;
    checklistSnapshot?: Record<string, unknown> | null;
    closureNotes?: string | null;
  }): Promise<{ stage: ProjectStageWithDetailsRow; event: StageStateHistoryRow | null }> {
    return await db.transaction(async (trx) => {
      const existing = await trx('project_stage')
        .where({ project_id: projectId, stage_no: stageNo })
        .first();

      if (!existing) {
        throw new Error('Project stage not found');
      }

      const patch: Record<string, unknown> = {
        last_changed_by: actorId,
        last_changed_at: trx.fn.now(),
      };

      let historyEvent: StageEvent | null = null;
      const targetState = toState ?? existing.state;

      if (toState && toState !== existing.state) {
        patch.state = toState;
        if (existing.state === 'not_started' && toState === 'active') {
          historyEvent = 'activated';
        } else if (existing.state === 'active' && toState === 'inactive') {
          historyEvent = 'deactivated';
        } else if (existing.state === 'inactive' && toState === 'active') {
          historyEvent = 'activated';
        } else if (toState === 'complete') {
          historyEvent = 'completed';
        } else if (existing.state === 'complete' && toState === 'active') {
          historyEvent = 'reopened';
        } else {
          historyEvent = toState === 'active' ? 'activated' : 'deactivated';
        }
      }

      if (inScope !== undefined && inScope !== existing.in_scope) {
        patch.in_scope = inScope;
        if (!historyEvent) {
          historyEvent = inScope ? 'added_to_scope' : 'removed_from_scope';
        }
      }

      const [updatedStage] = await trx('project_stage')
        .where({ project_id: projectId, stage_no: stageNo })
        .update(patch)
        .returning(PROJECT_STAGE_COLS);

      let createdEvent: StageStateHistoryRow | null = null;
      if (historyEvent) {
        const [evt] = await trx('stage_state_history')
          .insert({
            event_id: randomUUID(),
            project_id: projectId,
            stage_no: stageNo,
            event: historyEvent,
            from_state: existing.state,
            to_state: targetState,
            reason: reason ?? null,
            checklist_snapshot: historyEvent === 'completed' ? (checklistSnapshot ?? { template_id: null, items: [] }) : null,
            closure_notes: historyEvent === 'completed' ? (closureNotes ?? null) : null,
            actor_id: actorId,
            occurred_at: new Date(),
          })
          .returning(STAGE_STATE_HISTORY_COLS);
        createdEvent = evt;
      }

      const pdmStage = await trx('pdm_stage').where({ stage_no: stageNo }).first();

      return {
        stage: {
          ...updatedStage,
          stage_name: pdmStage?.name ?? '',
          phase_id: pdmStage?.phase_id ?? 1,
        },
        event: createdEvent,
      };
    });
  }

  static async delete(
    projectId: string,
    stageNo: number,
    trx?: Knex.Transaction,
  ): Promise<ProjectStageRow | null> {
    const q = trx ? trx('project_stage') : db('project_stage');
    const [row] = await q
      .where({ project_id: projectId, stage_no: stageNo })
      .del()
      .returning(PROJECT_STAGE_COLS);
    return row ?? null;
  }
}


export interface ProjectRow {
  project_id: string;
  project_code: string;
  name: string;
  program_id: number;
  client_name: string | null;
  country: string | null;
  site_location: string | null;
  timezone: string;
  status: 'active' | 'on_hold' | 'complete' | 'cancelled';
}

export class Projects {
  static async getById(projectId: string): Promise<ProjectRow | null> {
    const row = await db('projects').where({ project_id: projectId }).first();
    return row ?? null;
  }
}

export type ActivityStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

export interface StageActivityRow {
  activity_id: string;
  project_id: string;
  stage_no: number;
  title: string;
  description: string | null;
  status: ActivityStatus;
  due_date: string | null;
  owner_id: string | null;
  completed_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateStageActivityInput {
  activity_id: string;
  project_id: string;
  stage_no: number;
  title: string;
  description?: string | null;
  status?: ActivityStatus;
  due_date?: string | null;
  owner_id?: string | null;
  completed_at?: Date | null;
  created_by: string;
}

export interface UpdateStageActivityFields {
  stage_no?: number;
  title?: string;
  description?: string | null;
  status?: ActivityStatus;
  due_date?: string | null;
  owner_id?: string | null;
  completed_at?: Date | null;
}

const STAGE_ACTIVITY_COLS = [
  'activity_id',
  'project_id',
  'stage_no',
  'title',
  'description',
  'status',
  'due_date',
  'owner_id',
  'completed_at',
  'created_by',
  'created_at',
  'updated_at',
];

export class StageActivities {
  static async create(
    input: CreateStageActivityInput,
    trx?: Knex.Transaction,
  ): Promise<StageActivityRow> {
    const q = trx ? trx('stage_activity') : db('stage_activity');
    const [row] = await q.insert(input).returning(STAGE_ACTIVITY_COLS);
    return row;
  }

  static async list({
    projectId,
    stageNo,
    status,
    ownerId,
    page = 1,
    limit = 25,
  }: {
    projectId: string;
    stageNo?: number;
    status?: ActivityStatus;
    ownerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    stageActivities: StageActivityRow[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const base = db('stage_activity').where({ project_id: projectId });
    if (stageNo !== undefined) base.andWhere({ stage_no: stageNo });
    if (status) base.andWhere({ status });
    if (ownerId) base.andWhere({ owner_id: ownerId });

    const countRows = await base.clone().count<{ count: string }[]>('activity_id as count');
    const total = Number(countRows[0]?.count ?? 0);

    const stageActivities = await base
      .clone()
      .select(STAGE_ACTIVITY_COLS)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      stageActivities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  static async getById(
    projectId: string,
    activityId: string,
  ): Promise<StageActivityRow | null> {
    const row = await db('stage_activity')
      .where({ project_id: projectId, activity_id: activityId })
      .first();
    return row ?? null;
  }

  static async update(
    projectId: string,
    activityId: string,
    patch: UpdateStageActivityFields,
    trx?: Knex.Transaction,
  ): Promise<StageActivityRow | null> {
    const q = trx ? trx('stage_activity') : db('stage_activity');
    const [row] = await q
      .where({ project_id: projectId, activity_id: activityId })
      .update(patch)
      .returning(STAGE_ACTIVITY_COLS);
    return row ?? null;
  }

  static async delete(
    projectId: string,
    activityId: string,
    trx?: Knex.Transaction,
  ): Promise<StageActivityRow | null> {
    const q = trx ? trx('stage_activity') : db('stage_activity');
    const [row] = await q
      .where({ project_id: projectId, activity_id: activityId })
      .del()
      .returning(STAGE_ACTIVITY_COLS);
    return row ?? null;
  }
}

export interface StageActivityAttachmentRow {
  attachment_id: string;
  activity_id: string;
  file_id: string;
  caption: string | null;
  sort_order: number;
  uploaded_by: string;
  uploaded_at: Date;
  removed_by: string | null;
  removed_at: Date | null;
}

export interface CreateStageActivityAttachmentInput {
  attachment_id: string;
  activity_id: string;
  file_id: string;
  caption?: string | null;
  sort_order?: number;
  uploaded_by: string;
}

export interface UpdateStageActivityAttachmentFields {
  caption?: string | null;
  sort_order?: number;
}

const STAGE_ACTIVITY_ATTACHMENT_COLS = [
  'attachment_id',
  'activity_id',
  'file_id',
  'caption',
  'sort_order',
  'uploaded_by',
  'uploaded_at',
  'removed_by',
  'removed_at',
];

export class StageActivityAttachments {
  static async create(
    input: CreateStageActivityAttachmentInput,
    trx?: Knex.Transaction,
  ): Promise<StageActivityAttachmentRow> {
    const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
    const [row] = await q.insert(input).returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
    return row;
  }

  static async list({
    activityId,
    includeRemoved = false,
  }: {
    activityId: string;
    includeRemoved?: boolean;
  }): Promise<StageActivityAttachmentRow[]> {
    const query = db('stage_activity_attachment')
      .where({ activity_id: activityId })
      .orderBy('sort_order', 'asc')
      .orderBy('uploaded_at', 'asc');

    if (!includeRemoved) {
      query.whereNull('removed_at');
    }

    return await query.select(STAGE_ACTIVITY_ATTACHMENT_COLS);
  }

  static async getById(
    attachmentId: string,
    activityId?: string,
  ): Promise<StageActivityAttachmentRow | null> {
    const query = db('stage_activity_attachment').where({ attachment_id: attachmentId });
    if (activityId) {
      query.andWhere({ activity_id: activityId });
    }
    const row = await query.first();
    return row ?? null;
  }

  static async update(
    attachmentId: string,
    patch: UpdateStageActivityAttachmentFields,
    trx?: Knex.Transaction,
  ): Promise<StageActivityAttachmentRow | null> {
    const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
    const [row] = await q
      .where({ attachment_id: attachmentId })
      .update(patch)
      .returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
    return row ?? null;
  }

  static async softDelete(
    attachmentId: string,
    removedBy: string,
    trx?: Knex.Transaction,
  ): Promise<StageActivityAttachmentRow | null> {
    const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
    const [row] = await q
      .where({ attachment_id: attachmentId })
      .whereNull('removed_at')
      .update({
        removed_by: removedBy,
        removed_at: db.fn.now(),
      })
      .returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
    return row ?? null;
  }

  static async hardDelete(
    attachmentId: string,
    trx?: Knex.Transaction,
  ): Promise<StageActivityAttachmentRow | null> {
    const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
    const [row] = await q
      .where({ attachment_id: attachmentId })
      .del()
      .returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
    return row ?? null;
  }
}
