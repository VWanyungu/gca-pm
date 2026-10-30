import { randomUUID } from 'crypto';
import db from '../dbSetup.js';
import { writebackDprActivityProgress } from '../../utils/scheduleWriteback.js';
import { refreshProjectMetrics } from '../../utils/scheduleRisks.js';
import { objectUrl } from '../../utils/objectStorage.js';
export class Users {
    static async getAllUsers({ page = 1, limit = 10, search, globalRole, status, }) {
        const offset = (page - 1) * limit;
        const base = db('users');
        if (search) {
            const term = `%${search.toLowerCase()}%`;
            base.where((qb) => {
                qb.whereRaw('lower(first_name || \' \' || last_name) like ?', [term]).orWhereRaw('lower(email) like ?', [
                    term,
                ]);
            });
        }
        if (status)
            base.where({ status });
        if (globalRole) {
            base.whereExists(db('roles')
                .whereRaw('roles.user_id = users.id')
                .andWhere({ role: globalRole, scope_type: 'global' })
                .whereNull('revoked_at'));
        }
        const countRows = await base.clone().count('id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const [activeRow] = await db('users').where({ status: 'active' }).count('id as count');
        const activeCount = activeRow?.count ?? '0';
        const rows = await base
            .clone()
            .select('id', 'first_name', 'last_name', 'email', 'username', 'phone_number', 'status', 'is_verified', 'last_login', 'created_at')
            .limit(limit)
            .offset(offset)
            .orderBy('id');
        const ids = rows.map((r) => r.id);
        const roleRows = ids.length
            ? await db('roles')
                .select('user_id', 'role', 'scope_type', 'program_id', 'project_id')
                .whereIn('user_id', ids)
                .whereNull('revoked_at')
            : [];
        const programIds = [...new Set(roleRows.filter((r) => r.program_id != null).map((r) => r.program_id))];
        const projectIds = [...new Set(roleRows.filter((r) => r.project_id != null).map((r) => r.project_id))];
        const programs = programIds.length
            ? await db('programs').select('program_id', 'name').whereIn('program_id', programIds)
            : [];
        const projects = projectIds.length
            ? await db('projects').select('project_id', 'name').whereIn('project_id', projectIds)
            : [];
        const users = rows.map((row) => {
            const ownRoles = roleRows.filter((r) => r.user_id === row.id);
            const globalRoleRow = ownRoles.find((r) => r.scope_type === 'global' && r.role !== 'Admin') ??
                ownRoles.find((r) => r.scope_type === 'global');
            const scoped = ownRoles.filter((r) => r.scope_type !== 'global');
            return {
                ...row,
                global_role: globalRoleRow ? globalRoleRow.role : null,
                project_access: scoped.map((r) => ({
                    role: r.role,
                    scopeName: r.scope_type === 'project'
                        ? projects.find((p) => p.project_id === r.project_id)?.name ?? 'Unknown project'
                        : programs.find((p) => p.program_id === r.program_id)?.name ?? 'Unknown program',
                })),
            };
        });
        return {
            users,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
            activeCount: Number(activeCount ?? 0),
        };
    }
    static async getUserById(id) {
        const user = await db('users')
            .select('id', 'first_name', 'last_name', 'email', 'phone_number', 'status')
            .where({ id })
            .first();
        if (!user)
            return null;
        const roleRows = await db('roles')
            .select('attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at')
            .where({ user_id: id })
            .whereNull('revoked_at');
        const programIds = roleRows.filter((r) => r.program_id != null).map((r) => r.program_id);
        const projectIds = roleRows.filter((r) => r.project_id != null).map((r) => r.project_id);
        const programs = programIds.length
            ? await db('programs').select('program_id', 'name').whereIn('program_id', programIds)
            : [];
        const projects = projectIds.length
            ? await db('projects').select('project_id', 'name').whereIn('project_id', projectIds)
            : [];
        // "Main" PM/Planner isn't a flag in the schema: by convention (see frontend team-view.tsx's
        // `mainOf`) it's whoever was granted that role on the project earliest among active grants.
        const mainCandidateProjectIds = [
            ...new Set(roleRows.filter((r) => r.scope_type === 'project' && (r.role === 'PM' || r.role === 'Planner')).map((r) => r.project_id)),
        ];
        const mainHolderByKey = new Map();
        if (mainCandidateProjectIds.length) {
            const allGrants = await db('roles')
                .select('attribute_id', 'project_id', 'role', 'granted_at')
                .whereIn('project_id', mainCandidateProjectIds)
                .whereIn('role', ['PM', 'Planner'])
                .where('scope_type', 'project')
                .whereNull('revoked_at')
                .orderBy('granted_at', 'asc');
            for (const g of allGrants) {
                const key = `${g.project_id}:${g.role}`;
                if (!mainHolderByKey.has(key))
                    mainHolderByKey.set(key, g.attribute_id);
            }
        }
        const roles = roleRows.map((r) => ({
            ...r,
            scope_name: r.scope_type === 'program'
                ? programs.find((p) => p.program_id === r.program_id)?.name ?? null
                : r.scope_type === 'project'
                    ? projects.find((p) => p.project_id === r.project_id)?.name ?? null
                    : null,
            is_main: r.scope_type === 'project' &&
                (r.role === 'PM' || r.role === 'Planner') &&
                mainHolderByKey.get(`${r.project_id}:${r.role}`) === r.attribute_id,
        }));
        const globalRoleRow = roles.find((r) => r.scope_type === 'global' && r.role !== 'Admin') ??
            roles.find((r) => r.scope_type === 'global');
        return { ...user, global_role: globalRoleRow ? globalRoleRow.role : null, roles };
    }
    static async updateUser(id, input, actorId) {
        const patch = {};
        if (input.firstName !== undefined)
            patch.first_name = input.firstName;
        if (input.lastName !== undefined)
            patch.last_name = input.lastName;
        if (input.phone !== undefined)
            patch.phone_number = input.phone;
        if (Object.keys(patch).length) {
            patch.updated_at = db.fn.now();
            await db('users').where({ id }).update(patch);
        }
        if (input.globalRole !== undefined) {
            await Roles.setGlobalRole(id, input.globalRole, actorId);
        }
        return Users.getUserById(id);
    }
    static async setStatus(id, status) {
        const affected = await db('users').where({ id }).update({ status, updated_at: db.fn.now() });
        if (!affected)
            return null;
        return Users.getUserById(id);
    }
    /** Marks every access token issued before now as invalid (checked against the token's
     *  `iat` in authenticateToken). Returns the cutoff so the caller can seed the cache
     *  immediately, or null if the user doesn't exist. */
    static async invalidateSessions(id) {
        const [row] = await db('users')
            .where({ id })
            .update({ tokens_invalidated_at: db.fn.now(), updated_at: db.fn.now() })
            .returning('tokens_invalidated_at');
        return row ? row.tokens_invalidated_at : null;
    }
    static async getTokensInvalidatedAt(id) {
        const row = await db('users').select('tokens_invalidated_at').where({ id }).first();
        return row?.tokens_invalidated_at ?? null;
    }
    static async createUserAdmin(input, passwordHash, actorId) {
        const id = randomUUID();
        await db('users').insert({
            id,
            first_name: input.firstName,
            last_name: input.lastName,
            email: input.email,
            password_hash: passwordHash,
            username: input.email.split('@')[0],
            phone_number: input.phone ?? null,
            status: 'active',
            is_verified: false,
        });
        if (input.globalRole) {
            await Roles.setGlobalRole(id, input.globalRole, actorId);
        }
        return Users.getUserById(id);
    }
    static async getSingleUserByEmail(email) {
        const [user] = await db('users')
            .select('id', 'email', 'password_hash', 'first_name')
            .where('email', email);
        if (!user)
            return { userId: null, email: null, passwordHash: null, firstName: null };
        return { userId: user.id, email: user.email, passwordHash: user.password_hash, firstName: user.first_name };
    }
    static async createUser(input) {
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
            .returning(['id', 'email']);
        if (!user)
            throw new Error('Failed to create user');
        return { userId: user.id, email: user.email };
    }
    static async updateUserPassword(input) {
        try {
            const affected = await db('users')
                .where('id', input.userId)
                .update({ password_hash: input.passwordHash });
            if (affected === 0)
                return { status: 'fail', error: 'User not found' };
            return { status: 'success', error: null };
        }
        catch (err) {
            return { status: 'fail', error: err instanceof Error ? err.message : 'Unknown error' };
        }
    }
}
export class Tokens {
    static async getRefreshToken(token) {
        const [row] = await db('refreshTokens').select('refresh_token').where('refresh_token', token);
        return { refreshToken: row ? row.refresh_token : null };
    }
    static async storeRefreshToken(userId, token) {
        await db('refreshTokens').insert({ user_id: userId, refresh_token: token });
    }
    static async deleteRefreshToken(token) {
        const [deleted] = await db('refreshTokens')
            .where('refresh_token', token)
            .del()
            .returning('refresh_token');
        return { deletedToken: deleted ? deleted.refresh_token : null };
    }
    static async deleteAllRefreshTokensForUser(userId) {
        await db('refreshTokens').where({ user_id: userId }).del();
    }
    static async blacklistToken(token) {
        await db('tokens').insert({ token }).onConflict('token').ignore();
    }
    static async checkBlacklistToken(token) {
        const row = await db('tokens').select('id').where('token', token).first();
        return !!row;
    }
}
export class Roles {
    /** Replaces a user's single global role (e.g. the admin form's "Global role" field) with the given one, or clears it. */
    static async setGlobalRole(userId, role, actorId) {
        await db.transaction(async (trx) => {
            await trx('roles')
                .where({ user_id: userId, scope_type: 'global' })
                .whereNull('revoked_at')
                .update({ revoked_by: actorId, revoked_at: trx.fn.now(), revoke_reason: 'Replaced via admin global role change' });
            if (role) {
                await trx('roles').insert({
                    attribute_id: randomUUID(),
                    user_id: userId,
                    role,
                    scope_type: 'global',
                    program_id: null,
                    project_id: null,
                    granted_by: actorId,
                });
            }
        });
    }
    static async getRoles(userId) {
        const rows = await db('roles')
            .select('role', 'scope_type', 'program_id', 'project_id')
            .where({ user_id: userId })
            .whereNull('revoked_at');
        return rows;
    }
    static async grant(input) {
        const [row] = await db('roles').insert(input).returning('attribute_id');
        return row.attribute_id;
    }
    static async revoke(attributeId, revokedBy, reason) {
        const [row] = await db('roles')
            .where({ attribute_id: attributeId })
            .whereNull('revoked_at')
            .update({ revoked_by: revokedBy, revoked_at: db.fn.now(), revoke_reason: reason })
            .returning(['attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at']);
        return row ?? null;
    }
    static async list({ userId, projectId, page = 1, limit = 10, }) {
        const base = db('roles').whereNull('revoked_at');
        if (userId)
            base.where({ user_id: userId });
        if (projectId)
            base.where({ project_id: projectId });
        const countRows = await base.clone().count('attribute_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const roles = await base
            .clone()
            .join('users', 'users.id', 'roles.user_id')
            .select('roles.attribute_id', 'roles.user_id', 'roles.role', 'roles.scope_type', 'roles.program_id', 'roles.project_id', 'roles.granted_by', 'roles.granted_at', 'users.first_name', 'users.last_name', 'users.email')
            .orderBy('roles.granted_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { roles, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async getById(attributeId) {
        const row = await db('roles')
            .select('attribute_id', 'user_id', 'role', 'scope_type', 'program_id', 'project_id', 'granted_by', 'granted_at')
            .where({ attribute_id: attributeId })
            .whereNull('revoked_at')
            .first();
        return row ?? null;
    }
    /** Current main PM/Planner for a project: the earliest-granted active grant of that role (see getUserById). */
    static async getMainHolder(projectId, role) {
        const row = await db('roles')
            .join('users', 'users.id', 'roles.user_id')
            .select('roles.attribute_id', 'roles.user_id', 'roles.role', 'roles.scope_type', 'roles.program_id', 'roles.project_id', 'roles.granted_by', 'roles.granted_at', 'users.first_name', 'users.last_name')
            .where({ 'roles.project_id': projectId, 'roles.role': role, 'roles.scope_type': 'project' })
            .whereNull('roles.revoked_at')
            .orderBy('roles.granted_at', 'asc')
            .first();
        return row ?? null;
    }
    /** Atomically demotes the current main PM/Planner on a project and promotes the new holder. */
    static async reassignMain(input) {
        const { projectId, role, newUserId, actorId, reason } = input;
        return db.transaction(async (trx) => {
            const current = await trx('roles')
                .where({ project_id: projectId, role, scope_type: 'project' })
                .whereNull('revoked_at')
                .orderBy('granted_at', 'asc')
                .first();
            if (current) {
                await trx('roles')
                    .where({ attribute_id: current.attribute_id })
                    .update({ revoked_by: actorId, revoked_at: trx.fn.now(), revoke_reason: reason ?? 'Reassigned main ' + role });
            }
            const attributeId = randomUUID();
            await trx('roles').insert({
                attribute_id: attributeId,
                user_id: newUserId,
                role,
                scope_type: 'project',
                program_id: null,
                project_id: projectId,
                granted_by: actorId,
            });
            return attributeId;
        });
    }
}
export class RiskCategories {
    static async list({ includeInactive = false, page = 1, limit = 50, }) {
        const base = db('risk_category');
        if (!includeInactive)
            base.where({ is_active: true });
        const countRows = await base.clone().count('risk_category_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const categories = await base
            .clone()
            .select('risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active')
            .orderBy('sort_order', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const row = await db('risk_category').where({ risk_category_id: id }).first();
        return row ?? null;
    }
    static async getByCode(code) {
        const row = await db('risk_category').where({ code }).first();
        return row ?? null;
    }
    static async create(input) {
        const [row] = await db('risk_category')
            .insert({ ...input, is_active: input.is_active ?? true })
            .returning(['risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active']);
        return row;
    }
    static async update(id, input) {
        const [row] = await db('risk_category')
            .where({ risk_category_id: id })
            .update(input)
            .returning(['risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active']);
        return row ?? null;
    }
    static async deactivate(id) {
        const [row] = await db('risk_category')
            .where({ risk_category_id: id })
            .update({ is_active: false })
            .returning(['risk_category_id', 'code', 'name', 'is_system', 'sort_order', 'is_active']);
        return row ?? null;
    }
}
export class PdmStages {
    static async list() {
        return db('pdm_stage')
            .join('pdm_phase', 'pdm_stage.phase_id', 'pdm_phase.phase_id')
            .select('pdm_stage.stage_no', 'pdm_stage.name', 'pdm_stage.phase_id', 'pdm_phase.code as phase_code', 'pdm_phase.name as phase_name')
            .orderBy('pdm_stage.stage_no', 'asc');
    }
}
export class Programs {
    static async list({ includeInactive = false, page = 1, limit = 50, }) {
        const base = db('programs');
        if (!includeInactive)
            base.where({ is_active: true });
        const countRows = await base.clone().count('program_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const programs = await base
            .clone()
            .select('program_id', 'name', 'is_active')
            .orderBy('program_id', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { programs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const row = await db('programs').where({ program_id: id }).first();
        return row ?? null;
    }
    static async getByName(name) {
        const row = await db('programs').where({ name }).first();
        return row ?? null;
    }
    static async create(input) {
        const [row] = await db('programs')
            .insert({ name: input.name, is_active: input.is_active ?? true })
            .returning(['program_id', 'name', 'is_active']);
        return row;
    }
    static async update(id, input) {
        const [row] = await db('programs')
            .where({ program_id: id })
            .update(input)
            .returning(['program_id', 'name', 'is_active']);
        return row ?? null;
    }
    static async deactivate(id) {
        const [row] = await db('programs')
            .where({ program_id: id })
            .update({ is_active: false })
            .returning(['program_id', 'name', 'is_active']);
        return row ?? null;
    }
}
export class WeatherCategories {
    static async list({ includeInactive = false, page = 1, limit = 50, }) {
        const base = db('weather_category');
        if (!includeInactive)
            base.where({ is_active: true });
        const countRows = await base.clone().count('weather_category_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const categories = await base
            .clone()
            .select('weather_category_id', 'name', 'sort_order', 'is_active')
            .orderBy('sort_order', 'asc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { categories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async getById(id) {
        const row = await db('weather_category').where({ weather_category_id: id }).first();
        return row ?? null;
    }
    static async getByName(name) {
        const row = await db('weather_category').where({ name }).first();
        return row ?? null;
    }
    static async create(input) {
        const [row] = await db('weather_category')
            .insert({ ...input, is_active: input.is_active ?? true })
            .returning(['weather_category_id', 'name', 'sort_order', 'is_active']);
        return row;
    }
    static async update(id, input) {
        const [row] = await db('weather_category')
            .where({ weather_category_id: id })
            .update(input)
            .returning(['weather_category_id', 'name', 'sort_order', 'is_active']);
        return row ?? null;
    }
    static async deactivate(id) {
        const [row] = await db('weather_category')
            .where({ weather_category_id: id })
            .update({ is_active: false })
            .returning(['weather_category_id', 'name', 'sort_order', 'is_active']);
        return row ?? null;
    }
}
export class PersonnelRoles {
    static async list({ includeInactive = false, } = {}) {
        const base = db('personnel_role');
        if (!includeInactive)
            base.where({ is_active: true });
        const roles = await base
            .select('personnel_role_id', 'name', 'sort_order', 'is_active')
            .orderBy('sort_order', 'asc');
        return { roles };
    }
    /** Site engineers add roles from the DPR form, so a repeat of an existing name must return
     *  that role rather than fail the unique index. Matching is case-insensitive because
     *  "Welder" and "welder" are the same trade to the person typing. */
    static async findOrCreate(name) {
        const trimmed = name.trim();
        const existing = await db('personnel_role')
            .whereRaw('lower(name) = lower(?)', [trimmed])
            .select('personnel_role_id', 'name', 'sort_order', 'is_active')
            .first();
        if (existing) {
            // A role deactivated earlier is revived rather than duplicated under a new id.
            if (existing.is_active)
                return existing;
            const [revived] = await db('personnel_role')
                .where({ personnel_role_id: existing.personnel_role_id })
                .update({ is_active: true })
                .returning(['personnel_role_id', 'name', 'sort_order', 'is_active']);
            return revived;
        }
        // New roles sort after the seeded ones so the reference list keeps its intended order.
        const maxRow = await db('personnel_role').max('sort_order as max').first();
        const [row] = await db('personnel_role')
            .insert({ name: trimmed, sort_order: Number(maxRow?.max ?? 0) + 10, is_active: true })
            .returning(['personnel_role_id', 'name', 'sort_order', 'is_active']);
        return row;
    }
}
const RISK_COLS = [
    'risk_id', 'project_id', 'stage_no', 'title', 'description', 'category_id',
    'likelihood', 'impact', 'score', 'owner_id', 'mitigation', 'review_by', 'status',
    'addressed_at', 'addressed_submission_id', 'dismissal_reason', 'auto_resolution_reason',
    'source', 'source_task_id', 'source_schedule_version_id',
    'kind', 'realised_at', 'realised_by',
    'opened_at', 'closed_at', 'created_by', 'updated_at',
];
export class RiskIssues {
    static async create(input) {
        const [row] = await db('risk').insert(input).returning(RISK_COLS);
        return row;
    }
    static async list({ projectId, status, kind, stageNo, source, rating, search, page = 1, limit = 25, }) {
        const base = db('risk').where({ project_id: projectId });
        if (status)
            base.andWhere({ status });
        if (kind)
            base.andWhere({ kind });
        if (stageNo !== undefined)
            base.andWhere({ stage_no: stageNo });
        if (source)
            base.andWhere({ source });
        if (rating === 'low')
            base.andWhere('score', '<', 8);
        if (rating === 'medium')
            base.andWhere('score', '>=', 8).andWhere('score', '<', 15);
        if (rating === 'high')
            base.andWhere('score', '>=', 15);
        if (search)
            base.andWhereILike('title', `%${search}%`);
        const countRows = await base.clone().count('risk_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const riskIssues = await base
            .clone()
            .select(RISK_COLS)
            .orderBy('opened_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { riskIssues, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async getById(projectId, riskId) {
        const row = await db('risk')
            .leftJoin('users as owner', 'risk.owner_id', 'owner.id')
            .where({ 'risk.project_id': projectId, 'risk.risk_id': riskId })
            .select('risk.*', db.raw("NULLIF(CONCAT(owner.first_name, ' ', owner.last_name), ' ') as owner_name"))
            .first();
        return row ?? null;
    }
    static async update(projectId, riskId, patch) {
        const [row] = await db('risk')
            .where({ project_id: projectId, risk_id: riskId })
            .update(patch)
            .returning(RISK_COLS);
        return row ?? null;
    }
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
    static async create(input, trx) {
        const q = trx ? trx('stage_state_history') : db('stage_state_history');
        const [row] = await q.insert(input).returning(STAGE_STATE_HISTORY_COLS);
        return row;
    }
    static async list({ projectId, stageNo, event, page = 1, limit = 25, }) {
        const base = db('stage_state_history').where({ project_id: projectId });
        if (stageNo !== undefined)
            base.andWhere({ stage_no: stageNo });
        if (event)
            base.andWhere({ event });
        const countRows = await base.clone().count('event_id as count');
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
    static async getById(projectId, eventId) {
        const row = await db('stage_state_history')
            .where({ project_id: projectId, event_id: eventId })
            .first();
        return row ?? null;
    }
    static async update(projectId, eventId, patch, trx) {
        const q = trx ? trx('stage_state_history') : db('stage_state_history');
        const [row] = await q
            .where({ project_id: projectId, event_id: eventId })
            .update(patch)
            .returning(STAGE_STATE_HISTORY_COLS);
        return row ?? null;
    }
    static async delete(projectId, eventId, trx) {
        const q = trx ? trx('stage_state_history') : db('stage_state_history');
        const [row] = await q
            .where({ project_id: projectId, event_id: eventId })
            .del()
            .returning(STAGE_STATE_HISTORY_COLS);
        return row ?? null;
    }
    static async recordTransition({ projectId, stageNo, event, fromState, toState, reason, checklistSnapshot, closureNotes, actorId, submissionId, updateProjectStage = true, }) {
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
                }
                else {
                    const patch = {
                        state: toState,
                        last_changed_by: actorId,
                        last_changed_at: trx.fn.now(),
                    };
                    if (event === 'added_to_scope') {
                        patch.in_scope = true;
                    }
                    else if (event === 'removed_from_scope') {
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
export class ProjectStages {
    static async get(projectId, stageNo, trx) {
        const q = trx ? trx('project_stage') : db('project_stage');
        const row = await q
            .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
            .where({ 'project_stage.project_id': projectId, 'project_stage.stage_no': stageNo })
            .select('project_stage.project_id', 'project_stage.stage_no', 'pdm_stage.name as stage_name', 'pdm_stage.phase_id', 'project_stage.in_scope', 'project_stage.state', 'project_stage.added_to_scope_by', 'project_stage.added_to_scope_at', 'project_stage.last_changed_by', 'project_stage.last_changed_at')
            .first();
        return row ?? null;
    }
    static async list({ projectId, inScope, state, }) {
        const query = db('project_stage')
            .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
            .where('project_stage.project_id', projectId)
            .select('project_stage.project_id', 'project_stage.stage_no', 'pdm_stage.name as stage_name', 'pdm_stage.phase_id', 'project_stage.in_scope', 'project_stage.state', 'project_stage.added_to_scope_by', 'project_stage.added_to_scope_at', 'project_stage.last_changed_by', 'project_stage.last_changed_at')
            .orderBy('project_stage.stage_no', 'asc');
        if (inScope !== undefined) {
            query.andWhere('project_stage.in_scope', inScope);
        }
        if (state !== undefined) {
            query.andWhere('project_stage.state', state);
        }
        return await query;
    }
    static async create({ projectId, stageNo, inScope = true, state = 'not_started', actorId, reason, }) {
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
    static async update(projectId, stageNo, patch, trx) {
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
    static async transition({ projectId, stageNo, toState, inScope, actorId, reason, checklistSnapshot, closureNotes, }) {
        return await db.transaction(async (trx) => {
            const existing = await trx('project_stage')
                .where({ project_id: projectId, stage_no: stageNo })
                .first();
            if (!existing) {
                throw new Error('Project stage not found');
            }
            const patch = {
                last_changed_by: actorId,
                last_changed_at: trx.fn.now(),
            };
            let historyEvent = null;
            const targetState = toState ?? existing.state;
            if (toState && toState !== existing.state) {
                patch.state = toState;
                if (existing.state === 'not_started' && toState === 'active') {
                    historyEvent = 'activated';
                }
                else if (existing.state === 'active' && toState === 'inactive') {
                    historyEvent = 'deactivated';
                }
                else if (existing.state === 'inactive' && toState === 'active') {
                    historyEvent = 'activated';
                }
                else if (toState === 'complete') {
                    historyEvent = 'completed';
                }
                else if (existing.state === 'complete' && toState === 'active') {
                    historyEvent = 'reopened';
                }
                else {
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
            let createdEvent = null;
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
            // Completing a stage hands the project on to whatever's next in scope, so "current
            // stage" never goes blank mid-project (only once every in-scope stage is done).
            if (historyEvent === 'completed') {
                const nextStage = await trx('project_stage')
                    .where({ project_id: projectId, in_scope: true, state: 'not_started' })
                    .andWhere('stage_no', '>', stageNo)
                    .orderBy('stage_no', 'asc')
                    .first();
                if (nextStage) {
                    await trx('project_stage')
                        .where({ project_id: projectId, stage_no: nextStage.stage_no })
                        .update({ state: 'active', last_changed_by: actorId, last_changed_at: trx.fn.now() });
                    await trx('stage_state_history').insert({
                        event_id: randomUUID(),
                        project_id: projectId,
                        stage_no: nextStage.stage_no,
                        event: 'activated',
                        from_state: 'not_started',
                        to_state: 'active',
                        reason: 'Auto-activated after the preceding stage was completed',
                        checklist_snapshot: null,
                        closure_notes: null,
                        actor_id: actorId,
                        occurred_at: new Date(),
                    });
                }
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
    static async delete(projectId, stageNo, trx) {
        const q = trx ? trx('project_stage') : db('project_stage');
        const [row] = await q
            .where({ project_id: projectId, stage_no: stageNo })
            .del()
            .returning(PROJECT_STAGE_COLS);
        return row ?? null;
    }
}
const PROJECT_STAGE_CHECKLIST_ITEM_COLS = [
    'item_id',
    'project_id',
    'stage_no',
    'text',
    'sort_order',
    'is_checked',
    'created_by',
    'created_at',
    'updated_by',
    'updated_at',
];
export class ProjectStageChecklistItems {
    static async list(projectId, stageNo) {
        return await db('project_stage_checklist_item')
            .where({ project_id: projectId, stage_no: stageNo })
            .orderBy('sort_order', 'asc')
            .select(PROJECT_STAGE_CHECKLIST_ITEM_COLS);
    }
    static async getById(itemId, projectId, stageNo) {
        const row = await db('project_stage_checklist_item')
            .where({ item_id: itemId, project_id: projectId, stage_no: stageNo })
            .first();
        return row ?? null;
    }
    static async create({ projectId, stageNo, text, actorId, }) {
        const maxRows = await db('project_stage_checklist_item')
            .where({ project_id: projectId, stage_no: stageNo })
            .max('sort_order as max');
        const max = maxRows[0]?.max ?? null;
        const [row] = await db('project_stage_checklist_item')
            .insert({
            item_id: randomUUID(),
            project_id: projectId,
            stage_no: stageNo,
            text,
            sort_order: (max ?? -1) + 1,
            created_by: actorId,
            updated_by: actorId,
        })
            .returning(PROJECT_STAGE_CHECKLIST_ITEM_COLS);
        return row;
    }
    static async update(itemId, projectId, stageNo, patch, actorId) {
        const [row] = await db('project_stage_checklist_item')
            .where({ item_id: itemId, project_id: projectId, stage_no: stageNo })
            .update({ ...patch, updated_by: actorId, updated_at: db.fn.now() })
            .returning(PROJECT_STAGE_CHECKLIST_ITEM_COLS);
        return row ?? null;
    }
    static async delete(itemId, projectId, stageNo) {
        const [row] = await db('project_stage_checklist_item')
            .where({ item_id: itemId, project_id: projectId, stage_no: stageNo })
            .del()
            .returning(PROJECT_STAGE_CHECKLIST_ITEM_COLS);
        return row ?? null;
    }
    static async deleteAll(projectId, stageNo) {
        return await db('project_stage_checklist_item').where({ project_id: projectId, stage_no: stageNo }).del();
    }
}
export const PROJECT_COLS = [
    'project_id',
    'project_code',
    'name',
    'program_id',
    'client_name',
    'country',
    'site_location',
    'site_lat',
    'site_lng',
    'timezone',
    'is_civil',
    'is_mechanical',
    'is_electrical',
    'expected_start_date',
    'expected_end_date',
    'estimated_value',
    'currency',
    'status',
    'legacy_source_ref',
    'holiday_calendar_id',
    'dpr_expected_weekdays',
    'created_by',
    'created_at',
    'updated_at',
];
export class ProjectStatusHistory {
    static async create(input, trx) {
        const q = trx ? trx('project_status_history') : db('project_status_history');
        const [row] = await q
            .insert({
            history_id: input.history_id ?? randomUUID(),
            project_id: input.project_id,
            from_status: input.from_status,
            to_status: input.to_status,
            reason: input.reason ?? null,
            actor_id: input.actor_id,
        })
            .returning('*');
        return row;
    }
    static async listByProjectId(projectId) {
        return await db('project_status_history')
            .where({ project_id: projectId })
            .orderBy('changed_at', 'desc');
    }
}
function toLocalDateString(date, timezone) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}
export class ProjectMetrics {
    static async listByProjectId(projectId) {
        const rows = await db('project_metrics_snapshot')
            .where({ project_id: projectId })
            .select('project_id', 'as_of_date', 'planned_pct', 'actual_pct', 'spi', 'rag', 'baseline_finish', 'forecast_finish')
            .orderBy('as_of_date', 'asc');
        return rows.map((row) => ({
            ...row,
            planned_pct: Number(row.planned_pct),
            actual_pct: Number(row.actual_pct),
            spi: row.spi === null ? null : Number(row.spi),
        }));
    }
    /** AC-SCH-30 to 34: upsert today's (project-local) snapshot from the current schedule.
     *  Skips projects with no applied schedule version. No scheduled-job runner exists yet
     *  (see docs/app-constraints.md §10), so routes call this on read instead of nightly. */
    static async refreshSnapshot(projectId) {
        const version = await db('schedule_version')
            .where({ project_id: projectId, status: 'applied' })
            .whereNull('deleted_at')
            .orderBy('version_no', 'desc')
            .first('schedule_version_id');
        if (!version)
            return null;
        const project = await db('projects').where({ project_id: projectId }).first('timezone');
        if (!project)
            return null;
        // AC-SCH-31: qualifying tasks are current revisions of non-removed, non-summary tasks;
        // weight = duration_minutes (milestones have duration 0 and drop out of the weighted sums).
        const agg = await db('schedule_task_revision as r')
            .join('schedule_task as t', 't.task_id', 'r.task_id')
            .where('t.project_id', projectId)
            .whereNull('r.valid_to')
            .whereNull('t.removed_in_version_id')
            .andWhere('r.is_summary', false)
            .select(db.raw('SUM(r.duration_minutes) as total_weight'), db.raw('SUM(r.duration_minutes * r.pct_work_complete) as weighted_actual'), db.raw(`SUM(r.duration_minutes * (${PLANNED_I_EXPR})) as weighted_planned`), db.raw('MAX(r.baseline_finish) as baseline_finish'), db.raw('MAX(r.expected_finish) as forecast_finish'))
            .first();
        const totalWeight = Number(agg?.total_weight ?? 0);
        // project_metrics_snapshot.planned_pct/actual_pct are NOT NULL; AC-SCH-32's "both null when
        // Σw = 0" case (no qualifying tasks) has nothing to upsert, so skip instead of writing nulls.
        if (totalWeight <= 0)
            return null;
        const round2 = (n) => Math.round(n * 100) / 100;
        const plannedPct = round2(Number(agg.weighted_planned) / totalWeight);
        const actualPct = round2(Number(agg.weighted_actual) / totalWeight);
        const spi = plannedPct > 0 ? round2(actualPct / plannedPct) : null;
        const rag = spi === null ? null : spi >= 0.95 ? 'green' : spi >= 0.8 ? 'amber' : 'red';
        const asOfDate = toLocalDateString(new Date(), project.timezone);
        const toProjectLocalDate = (d) => (d ? toLocalDateString(d, project.timezone) : null);
        const [row] = await db('project_metrics_snapshot')
            .insert({
            project_id: projectId,
            as_of_date: asOfDate,
            schedule_version_id: version.schedule_version_id,
            planned_pct: plannedPct,
            actual_pct: actualPct,
            spi,
            rag,
            baseline_finish: toProjectLocalDate(agg.baseline_finish),
            forecast_finish: toProjectLocalDate(agg.forecast_finish),
            computed_at: db.fn.now(),
        })
            .onConflict(['project_id', 'as_of_date'])
            .merge(['schedule_version_id', 'planned_pct', 'actual_pct', 'spi', 'rag', 'baseline_finish', 'forecast_finish', 'computed_at'])
            .returning('*');
        return { ...row, planned_pct: Number(row.planned_pct), actual_pct: Number(row.actual_pct), spi: row.spi === null ? null : Number(row.spi) };
    }
}
export class ClientContacts {
    static async listByProjectId(projectId) {
        return db('client_contacts').where({ project_id: projectId }).orderBy('name', 'asc');
    }
    static async create(input) {
        const [row] = await db('client_contacts')
            .insert({
            contact_id: randomUUID(),
            project_id: input.project_id,
            name: input.name,
            email: input.email,
            title: input.title ?? null,
            receives_reports: input.receives_reports ?? true,
        })
            .returning('*');
        return row;
    }
    static async getById(contactId) {
        const row = await db('client_contacts').where({ contact_id: contactId }).first();
        return row ?? null;
    }
    static async delete(contactId) {
        await db('client_contacts').where({ contact_id: contactId }).del();
    }
}
export class Projects {
    static async create(input, trx) {
        const execute = async (t) => {
            const projectId = input.project_id ?? randomUUID();
            const [project] = await t('projects')
                .insert({
                project_id: projectId,
                project_code: input.project_code,
                name: input.name,
                program_id: input.program_id,
                client_name: input.client_name ?? null,
                country: input.country ?? null,
                site_location: input.site_location ?? null,
                site_lat: input.site_lat ?? null,
                site_lng: input.site_lng ?? null,
                timezone: input.timezone ?? 'Africa/Nairobi',
                is_civil: input.is_civil ?? false,
                is_mechanical: input.is_mechanical ?? true,
                is_electrical: input.is_electrical ?? false,
                expected_start_date: input.expected_start_date ?? null,
                expected_end_date: input.expected_end_date ?? null,
                estimated_value: input.estimated_value ?? null,
                currency: input.currency ?? null,
                status: input.status ?? 'active',
                legacy_source_ref: input.legacy_source_ref ?? null,
                holiday_calendar_id: input.holiday_calendar_id ?? null,
                dpr_expected_weekdays: input.dpr_expected_weekdays ?? [1, 2, 3, 4, 5, 6],
                created_by: input.created_by,
            })
                .returning(PROJECT_COLS);
            // Grant PM@project to creator or designated PM
            const pmUserId = input.pm_user_id || input.created_by;
            await t('roles').insert({
                attribute_id: randomUUID(),
                user_id: pmUserId,
                role: 'PM',
                scope_type: 'project',
                program_id: null,
                project_id: projectId,
                granted_by: input.created_by,
                granted_at: t.fn.now(),
            });
            // Grant Planner@project if specified
            if (input.planner_user_id) {
                await t('roles').insert({
                    attribute_id: randomUUID(),
                    user_id: input.planner_user_id,
                    role: 'Planner',
                    scope_type: 'project',
                    program_id: null,
                    project_id: projectId,
                    granted_by: input.created_by,
                    granted_at: t.fn.now(),
                });
            }
            // Grant SiteEngineer@project to each assigned engineer
            for (const userId of input.site_engineer_user_ids ?? []) {
                await t('roles').insert({
                    attribute_id: randomUUID(),
                    user_id: userId,
                    role: 'SiteEngineer',
                    scope_type: 'project',
                    program_id: null,
                    project_id: projectId,
                    granted_by: input.created_by,
                    granted_at: t.fn.now(),
                });
            }
            // Populate stages 1..10
            const scopeSet = new Set(input.scope_stages && input.scope_stages.length > 0
                ? input.scope_stages
                : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            const activeSet = new Set(input.initial_active_stages && input.initial_active_stages.length > 0
                ? input.initial_active_stages
                : [Array.from(scopeSet)[0] ?? 1]);
            const stageRows = [];
            for (let s = 1; s <= 10; s++) {
                const inScope = scopeSet.has(s);
                const isActive = inScope && activeSet.has(s);
                const state = isActive ? 'active' : 'not_started';
                stageRows.push({
                    project_id: projectId,
                    stage_no: s,
                    in_scope: inScope,
                    state,
                    added_to_scope_by: input.created_by,
                    added_to_scope_at: t.fn.now(),
                    last_changed_by: input.created_by,
                    last_changed_at: t.fn.now(),
                });
            }
            await t('project_stage').insert(stageRows);
            // Log stage state history for in_scope stages
            for (let s = 1; s <= 10; s++) {
                if (scopeSet.has(s)) {
                    await t('stage_state_history').insert({
                        event_id: randomUUID(),
                        project_id: projectId,
                        stage_no: s,
                        event: 'added_to_scope',
                        from_state: null,
                        to_state: 'not_started',
                        reason: 'Project initialized',
                        checklist_snapshot: null,
                        closure_notes: null,
                        actor_id: input.created_by,
                        occurred_at: new Date(),
                    });
                    if (activeSet.has(s)) {
                        await t('stage_state_history').insert({
                            event_id: randomUUID(),
                            project_id: projectId,
                            stage_no: s,
                            event: 'activated',
                            from_state: 'not_started',
                            to_state: 'active',
                            reason: 'Initial active stage on project setup',
                            checklist_snapshot: null,
                            closure_notes: null,
                            actor_id: input.created_by,
                            occurred_at: new Date(),
                        });
                    }
                }
            }
            // Fetch created stages with details
            const stages = await t('project_stage')
                .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
                .where('project_stage.project_id', projectId)
                .select('project_stage.project_id', 'project_stage.stage_no', 'pdm_stage.name as stage_name', 'pdm_stage.phase_id', 'project_stage.in_scope', 'project_stage.state', 'project_stage.added_to_scope_by', 'project_stage.added_to_scope_at', 'project_stage.last_changed_by', 'project_stage.last_changed_at')
                .orderBy('project_stage.stage_no', 'asc');
            return { project, stages };
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async getById(projectId, trx) {
        const q = trx ? trx('projects') : db('projects');
        const row = await q.where({ project_id: projectId }).first();
        return row ?? null;
    }
    static async getByCode(projectCode, trx) {
        const q = trx ? trx('projects') : db('projects');
        const row = await q.where({ project_code: projectCode }).first();
        return row ?? null;
    }
    static async list({ programId, status, country, search, page = 1, limit = 25, }) {
        const query = db('projects');
        if (programId !== undefined) {
            query.where('program_id', programId);
        }
        if (status !== undefined) {
            query.where('status', status);
        }
        else {
            // AC-PRJ-11: deleted projects are hidden unless explicitly asked for.
            query.whereNot('status', 'deleted');
        }
        if (country) {
            query.whereILike('country', `%${country}%`);
        }
        if (search) {
            query.where((qb) => {
                qb.whereILike('name', `%${search}%`).orWhereILike('project_code', `%${search}%`);
            });
        }
        const countResult = await query.clone().count('project_id as count');
        const total = Number(countResult[0]?.count ?? 0);
        const totalPages = Math.ceil(total / limit) || 1;
        const projects = await query
            .select(PROJECT_COLS)
            .orderBy('created_at', 'desc')
            .offset((page - 1) * limit)
            .limit(limit);
        const projectIds = projects.map((p) => p.project_id);
        const [stageByProject, metricsByProject, milestoneByProject, programById, mainPmByProject] = await Promise.all([
            Projects.currentStageByProjectId(projectIds),
            Projects.latestMetricsByProjectId(projectIds),
            Projects.nextMilestoneByProjectId(projectIds),
            Projects.programNameById([...new Set(projects.map((p) => p.program_id))]),
            Projects.mainPmByProjectId(projectIds),
        ]);
        return {
            projects: projects.map((p) => ({
                ...p,
                current_stage_no: stageByProject.get(p.project_id)?.stage_no ?? null,
                current_stage_name: stageByProject.get(p.project_id)?.stage_name ?? null,
                spi: metricsByProject.get(p.project_id)?.spi ?? null,
                completed_pct: metricsByProject.get(p.project_id)?.actual_pct ?? null,
                planned_pct: metricsByProject.get(p.project_id)?.planned_pct ?? null,
                next_milestone: milestoneByProject.get(p.project_id)?.title ?? null,
                program_name: programById.get(p.program_id) ?? null,
                main_pm_name: mainPmByProject.get(p.project_id) ?? null,
            })),
            pagination: { page, limit, total, totalPages },
        };
    }
    static async programNameById(programIds) {
        const map = new Map();
        if (programIds.length === 0)
            return map;
        const rows = await db('programs').whereIn('program_id', programIds).select('program_id', 'name');
        for (const row of rows)
            map.set(row.program_id, row.name);
        return map;
    }
    /** Main PM per project: the earliest-granted active PM@project holder (see getUserById). */
    static async mainPmByProjectId(projectIds) {
        const map = new Map();
        if (projectIds.length === 0)
            return map;
        const rows = await db('roles')
            .join('users', 'users.id', 'roles.user_id')
            .whereIn('roles.project_id', projectIds)
            .where({ 'roles.role': 'PM', 'roles.scope_type': 'project' })
            .whereNull('roles.revoked_at')
            .select('roles.project_id', 'users.first_name', 'users.last_name', 'roles.granted_at')
            .orderBy('roles.granted_at', 'asc');
        for (const row of rows) {
            if (!map.has(row.project_id))
                map.set(row.project_id, `${row.first_name} ${row.last_name}`);
        }
        return map;
    }
    static async currentStageByProjectId(projectIds) {
        const map = new Map();
        if (projectIds.length === 0)
            return map;
        const rows = await db('project_stage')
            .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
            .whereIn('project_stage.project_id', projectIds)
            .where('project_stage.state', 'active')
            .select('project_stage.project_id', 'project_stage.stage_no', 'pdm_stage.name as stage_name')
            .orderBy('project_stage.stage_no', 'asc');
        for (const row of rows)
            map.set(row.project_id, row);
        // A project with every in-scope stage complete has no active stage — keep showing
        // the last one it completed rather than going blank.
        const withoutCurrent = projectIds.filter((id) => !map.has(id));
        if (withoutCurrent.length > 0) {
            const completedRows = await db('project_stage')
                .join('pdm_stage', 'project_stage.stage_no', 'pdm_stage.stage_no')
                .whereIn('project_stage.project_id', withoutCurrent)
                .where('project_stage.state', 'complete')
                .select('project_stage.project_id', 'project_stage.stage_no', 'pdm_stage.name as stage_name')
                .orderBy('project_stage.stage_no', 'asc');
            for (const row of completedRows)
                map.set(row.project_id, row);
        }
        return map;
    }
    static async latestMetricsByProjectId(projectIds) {
        const map = new Map();
        if (projectIds.length === 0)
            return map;
        const rows = await db('project_metrics_snapshot')
            .distinctOn('project_id')
            .whereIn('project_id', projectIds)
            .select('project_id', 'planned_pct', 'actual_pct', 'spi')
            .orderBy('project_id', 'asc')
            .orderBy('as_of_date', 'desc');
        for (const row of rows) {
            map.set(row.project_id, {
                planned_pct: Number(row.planned_pct),
                actual_pct: Number(row.actual_pct),
                spi: row.spi === null ? null : Number(row.spi),
            });
        }
        return map;
    }
    static async nextMilestoneByProjectId(projectIds) {
        const map = new Map();
        if (projectIds.length === 0)
            return map;
        const rows = await db('project_milestone_v')
            .distinctOn('project_id')
            .whereIn('project_id', projectIds)
            .whereNull('actual_date')
            .select('project_id', 'title', db.raw('COALESCE(forecast_date, planned_date) as due_date'))
            .orderBy('project_id', 'asc')
            .orderBy(db.raw('COALESCE(forecast_date, planned_date)'), 'asc');
        for (const row of rows)
            map.set(row.project_id, row);
        return map;
    }
    static async update(projectId, patch, actorId, reason, trx) {
        const execute = async (t) => {
            const existing = await t('projects').where({ project_id: projectId }).first();
            if (!existing)
                return null;
            // Handle status transition if status is being updated
            if (patch.status && patch.status !== existing.status) {
                const fromStatus = existing.status;
                const toStatus = patch.status;
                // AC-PRJ-04 validation:
                // Allowed:
                // active -> on_hold (reason required)
                // on_hold -> active
                // active -> complete
                // active or on_hold -> cancelled (reason required)
                // cancelled -> active (reason required)
                // any non-deleted status -> deleted (AC-PRJ-11, Admin-only — enforced by the caller)
                const allowedTransitions = {
                    active: ['on_hold', 'complete', 'cancelled', 'deleted'],
                    on_hold: ['active', 'cancelled', 'deleted'],
                    complete: ['deleted'],
                    cancelled: ['active', 'deleted'],
                    deleted: [],
                };
                if (!allowedTransitions[fromStatus].includes(toStatus)) {
                    throw new Error(`Invalid project status transition from '${fromStatus}' to '${toStatus}'`);
                }
                if (['on_hold', 'cancelled'].includes(toStatus) && !reason) {
                    throw new Error(`Reason is required when transitioning to '${toStatus}'`);
                }
                // Record status change in project_status_history
                if (actorId) {
                    await t('project_status_history').insert({
                        history_id: randomUUID(),
                        project_id: projectId,
                        from_status: fromStatus,
                        to_status: toStatus,
                        reason: reason ?? null,
                        actor_id: actorId,
                        changed_at: t.fn.now(),
                    });
                }
                // AC-PRJ-05: On cancellation, void all open escalations
                if (toStatus === 'cancelled') {
                    const hasEscalations = await t.schema.hasTable('escalation');
                    if (hasEscalations) {
                        await t('escalation')
                            .where({ project_id: projectId })
                            .whereIn('status', ['open', 'escalated'])
                            .update({
                            status: 'voided',
                            void_reason: 'project cancelled',
                        });
                    }
                }
            }
            const updateData = {
                ...patch,
                updated_at: t.fn.now(),
            };
            const [updated] = await t('projects')
                .where({ project_id: projectId })
                .update(updateData)
                .returning(PROJECT_COLS);
            return updated ?? null;
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async suggestNextCode(programId, year) {
        const currentYear = year ?? new Date().getFullYear();
        const programPrefix = String(programId).padStart(3, '0');
        const pattern = `${programPrefix}-%.${currentYear}`;
        const rows = await db('projects')
            .select('project_code')
            .where('program_id', programId)
            .whereILike('project_code', pattern);
        let maxSeq = 0;
        const regex = new RegExp(`^${programPrefix}-(\\d{3})\\.${currentYear}$`);
        for (const r of rows) {
            const match = r.project_code.match(regex);
            if (match && match[1]) {
                const seq = parseInt(match[1], 10);
                if (seq > maxSeq)
                    maxSeq = seq;
            }
        }
        const nextSeq = String(maxSeq + 1).padStart(3, '0');
        return `${programPrefix}-${nextSeq}.${currentYear}`;
    }
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
    static async create(input, trx) {
        const q = trx ? trx('stage_activity') : db('stage_activity');
        const [row] = await q.insert(input).returning(STAGE_ACTIVITY_COLS);
        return row;
    }
    static async list({ projectId, stageNo, status, ownerId, page = 1, limit = 25, }) {
        const base = db('stage_activity').where({ project_id: projectId });
        if (stageNo !== undefined)
            base.andWhere({ stage_no: stageNo });
        if (status)
            base.andWhere({ status });
        if (ownerId)
            base.andWhere({ owner_id: ownerId });
        const countRows = await base.clone().count('activity_id as count');
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
    static async getById(projectId, activityId) {
        const row = await db('stage_activity')
            .where({ project_id: projectId, activity_id: activityId })
            .first();
        return row ?? null;
    }
    static async update(projectId, activityId, patch, trx) {
        const q = trx ? trx('stage_activity') : db('stage_activity');
        const [row] = await q
            .where({ project_id: projectId, activity_id: activityId })
            .update(patch)
            .returning(STAGE_ACTIVITY_COLS);
        return row ?? null;
    }
    static async delete(projectId, activityId, trx) {
        const q = trx ? trx('stage_activity') : db('stage_activity');
        const [row] = await q
            .where({ project_id: projectId, activity_id: activityId })
            .del()
            .returning(STAGE_ACTIVITY_COLS);
        return row ?? null;
    }
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
    static async create(input, trx) {
        const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
        const [row] = await q.insert(input).returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
        return row;
    }
    static async list({ activityId, includeRemoved = false, }) {
        const query = db('stage_activity_attachment')
            .where({ activity_id: activityId })
            .orderBy('sort_order', 'asc')
            .orderBy('uploaded_at', 'asc');
        if (!includeRemoved) {
            query.whereNull('removed_at');
        }
        return await query.select(STAGE_ACTIVITY_ATTACHMENT_COLS);
    }
    static async getById(attachmentId, activityId) {
        const query = db('stage_activity_attachment').where({ attachment_id: attachmentId });
        if (activityId) {
            query.andWhere({ activity_id: activityId });
        }
        const row = await query.first();
        return row ?? null;
    }
    static async update(attachmentId, patch, trx) {
        const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
        const [row] = await q
            .where({ attachment_id: attachmentId })
            .update(patch)
            .returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
        return row ?? null;
    }
    static async softDelete(attachmentId, removedBy, trx) {
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
    static async hardDelete(attachmentId, trx) {
        const q = trx ? trx('stage_activity_attachment') : db('stage_activity_attachment');
        const [row] = await q
            .where({ attachment_id: attachmentId })
            .del()
            .returning(STAGE_ACTIVITY_ATTACHMENT_COLS);
        return row ?? null;
    }
}
const CONTRACTOR_COLS = [
    'contractor_id',
    'name',
    'name_normalized',
    'registration_no',
    'merged_into_id',
    'is_active',
    'created_by',
    'created_at',
];
function normalizeContractorName(name) {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
}
export class Contractors {
    static async create(input, trx) {
        const q = trx ? trx('contractor') : db('contractor');
        const [row] = await q
            .insert({
            contractor_id: input.contractor_id ?? randomUUID(),
            name: input.name.trim(),
            registration_no: input.registration_no ?? null,
            is_active: input.is_active ?? true,
            created_by: input.created_by,
        })
            .returning(CONTRACTOR_COLS);
        return row;
    }
    static async getById(contractorId, trx) {
        const q = trx ? trx('contractor') : db('contractor');
        const row = await q.where({ contractor_id: contractorId }).first();
        return row ?? null;
    }
    static async getByName(name, trx) {
        const q = trx ? trx('contractor') : db('contractor');
        const normalized = normalizeContractorName(name);
        const row = await q.where({ name_normalized: normalized }).first();
        return row ?? null;
    }
    static async findOrCreate(name, createdBy, trx) {
        const normalized = normalizeContractorName(name);
        const execute = async (t) => {
            let existing = await t('contractor').where({ name_normalized: normalized }).first();
            if (existing) {
                if (existing.merged_into_id) {
                    const target = await t('contractor').where({ contractor_id: existing.merged_into_id }).first();
                    if (target && !target.merged_into_id) {
                        existing = target;
                    }
                }
                return { contractor: existing, created: false };
            }
            const [created] = await t('contractor')
                .insert({
                contractor_id: randomUUID(),
                name: name.trim(),
                registration_no: null,
                is_active: true,
                created_by: createdBy,
            })
                .returning(CONTRACTOR_COLS);
            return { contractor: created, created: true };
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async list({ search, includeInactive = false, includeMerged = false, page = 1, limit = 25, } = {}) {
        const query = db('contractor');
        if (!includeInactive) {
            query.where('is_active', true);
        }
        if (!includeMerged) {
            query.whereNull('merged_into_id');
        }
        if (search) {
            const term = `%${search.trim().toLowerCase()}%`;
            query.where((qb) => {
                qb.whereILike('name', term).orWhereILike('registration_no', term);
            });
        }
        const countRows = await query.clone().count('contractor_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const totalPages = Math.ceil(total / limit) || 1;
        const contractors = await query
            .select(CONTRACTOR_COLS)
            .orderBy('name', 'asc')
            .offset((page - 1) * limit)
            .limit(limit);
        return {
            contractors,
            pagination: { page, limit, total, totalPages },
        };
    }
    static async update(contractorId, patch, trx) {
        const q = trx ? trx('contractor') : db('contractor');
        const updateData = {};
        if (patch.name !== undefined)
            updateData.name = patch.name.trim();
        if (patch.registration_no !== undefined)
            updateData.registration_no = patch.registration_no;
        if (patch.is_active !== undefined)
            updateData.is_active = patch.is_active;
        const [row] = await q
            .where({ contractor_id: contractorId })
            .update(updateData)
            .returning(CONTRACTOR_COLS);
        return row ?? null;
    }
    static async merge(sourceId, targetId, trx) {
        const execute = async (t) => {
            if (sourceId === targetId) {
                throw new Error('Cannot merge a contractor into itself');
            }
            const source = await t('contractor').where({ contractor_id: sourceId }).first();
            if (!source) {
                throw new Error('Source contractor not found');
            }
            const target = await t('contractor').where({ contractor_id: targetId }).first();
            if (!target) {
                throw new Error('Target contractor not found');
            }
            if (target.merged_into_id) {
                throw new Error('Target contractor is already merged into another contractor. Merge chains are not allowed');
            }
            const [updated] = await t('contractor')
                .where({ contractor_id: sourceId })
                .update({ merged_into_id: targetId, is_active: false })
                .returning(CONTRACTOR_COLS);
            return updated;
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async delete(contractorId, trx) {
        const q = trx ? trx('contractor') : db('contractor');
        const count = await q.where({ contractor_id: contractorId }).del();
        return count > 0;
    }
}
const PROJECT_CONTRACTOR_COLS = [
    'project_contractor_id',
    'project_id',
    'contractor_id',
    'party_type',
    'is_active',
    'added_by',
    'added_at',
];
export class ProjectContractors {
    static async link(input, trx) {
        const q = trx ? trx('project_contractor') : db('project_contractor');
        const [row] = await q
            .insert({
            project_contractor_id: input.project_contractor_id ?? randomUUID(),
            project_id: input.project_id,
            contractor_id: input.contractor_id,
            party_type: input.party_type ?? 'contractor',
            is_active: input.is_active ?? true,
            added_by: input.added_by,
        })
            .returning(PROJECT_CONTRACTOR_COLS);
        return row;
    }
    static async get(projectId, contractorId, trx) {
        const q = trx ? trx('project_contractor') : db('project_contractor');
        const row = await q
            .join('contractor', 'project_contractor.contractor_id', 'contractor.contractor_id')
            .where({
            'project_contractor.project_id': projectId,
            'project_contractor.contractor_id': contractorId,
        })
            .select('project_contractor.project_contractor_id', 'project_contractor.project_id', 'project_contractor.contractor_id', 'project_contractor.party_type', 'project_contractor.is_active', 'project_contractor.added_by', 'project_contractor.added_at', 'contractor.name as contractor_name', 'contractor.registration_no', 'contractor.merged_into_id')
            .first();
        return row ?? null;
    }
    static async getById(projectContractorId, trx) {
        const q = trx ? trx('project_contractor') : db('project_contractor');
        const row = await q
            .join('contractor', 'project_contractor.contractor_id', 'contractor.contractor_id')
            .where({ 'project_contractor.project_contractor_id': projectContractorId })
            .select('project_contractor.project_contractor_id', 'project_contractor.project_id', 'project_contractor.contractor_id', 'project_contractor.party_type', 'project_contractor.is_active', 'project_contractor.added_by', 'project_contractor.added_at', 'contractor.name as contractor_name', 'contractor.registration_no', 'contractor.merged_into_id')
            .first();
        return row ?? null;
    }
    static async listByProject(projectId, { includeInactive = false } = {}) {
        const query = db('project_contractor')
            .join('contractor', 'project_contractor.contractor_id', 'contractor.contractor_id')
            .where('project_contractor.project_id', projectId)
            .select('project_contractor.project_contractor_id', 'project_contractor.project_id', 'project_contractor.contractor_id', 'project_contractor.party_type', 'project_contractor.is_active', 'project_contractor.added_by', 'project_contractor.added_at', 'contractor.name as contractor_name', 'contractor.registration_no', 'contractor.merged_into_id')
            .orderBy('contractor.name', 'asc');
        if (!includeInactive) {
            query.where('project_contractor.is_active', true);
        }
        return await query;
    }
    static async update(projectContractorId, patch, trx) {
        const q = trx ? trx('project_contractor') : db('project_contractor');
        const [row] = await q
            .where({ project_contractor_id: projectContractorId })
            .update(patch)
            .returning(PROJECT_CONTRACTOR_COLS);
        return row ?? null;
    }
    static async delete(projectContractorId, trx) {
        const q = trx ? trx('project_contractor') : db('project_contractor');
        const count = await q.where({ project_contractor_id: projectContractorId }).del();
        return count > 0;
    }
}
const CUSTOM_MILESTONE_COLS = [
    'milestone_id',
    'project_id',
    'stage_no',
    'title',
    'planned_date',
    'forecast_date',
    'actual_date',
    'notes',
    'created_by',
    'created_at',
    'updated_by',
    'updated_at',
    'removed_by',
    'removed_at',
];
export class CustomMilestones {
    static async create(input, trx) {
        const q = trx ? trx('custom_milestones') : db('custom_milestones');
        const [row] = await q
            .insert({
            milestone_id: input.milestone_id ?? randomUUID(),
            project_id: input.project_id,
            stage_no: input.stage_no ?? null,
            title: input.title.trim(),
            planned_date: input.planned_date,
            forecast_date: input.forecast_date ?? null,
            actual_date: input.actual_date ?? null,
            notes: input.notes ?? null,
            created_by: input.created_by,
            updated_by: input.updated_by,
        })
            .returning(CUSTOM_MILESTONE_COLS);
        return row;
    }
    static async getById(milestoneId, projectId, trx) {
        const q = trx ? trx('custom_milestones') : db('custom_milestones');
        q.where({ milestone_id: milestoneId });
        if (projectId) {
            q.andWhere({ project_id: projectId });
        }
        const row = await q
            .select(CUSTOM_MILESTONE_COLS.concat([
            db.raw('(forecast_date - planned_date) as slippage_days'),
        ]))
            .first();
        return row ?? null;
    }
    static async list({ projectId, stageNo, includeRemoved = false, page = 1, limit = 50, }) {
        const query = db('custom_milestones').where({ project_id: projectId });
        if (!includeRemoved) {
            query.whereNull('removed_at');
        }
        if (stageNo !== undefined) {
            query.andWhere({ stage_no: stageNo });
        }
        const countRows = await query.clone().count('milestone_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const totalPages = Math.ceil(total / limit) || 1;
        const milestones = await query
            .select(CUSTOM_MILESTONE_COLS.concat([
            db.raw('(forecast_date - planned_date) as slippage_days'),
        ]))
            .orderBy('planned_date', 'asc')
            .offset((page - 1) * limit)
            .limit(limit);
        return {
            milestones,
            pagination: { page, limit, total, totalPages },
        };
    }
    static async listAllMilestones(projectId) {
        return await db('project_milestone_v')
            .where({ project_id: projectId })
            .orderBy('planned_date', 'asc');
    }
    static async update(milestoneId, patch, trx) {
        const q = trx ? trx('custom_milestones') : db('custom_milestones');
        const updateData = {
            ...patch,
            updated_at: (trx || db).fn.now(),
        };
        if (patch.title !== undefined)
            updateData.title = patch.title.trim();
        const [row] = await q
            .where({ milestone_id: milestoneId })
            .update(updateData)
            .returning(CUSTOM_MILESTONE_COLS);
        return row ?? null;
    }
    static async softDelete(milestoneId, removedBy, trx) {
        const q = trx ? trx('custom_milestones') : db('custom_milestones');
        const [row] = await q
            .where({ milestone_id: milestoneId })
            .whereNull('removed_at')
            .update({
            removed_by: removedBy,
            removed_at: (trx || db).fn.now(),
            updated_by: removedBy,
            updated_at: (trx || db).fn.now(),
        })
            .returning(CUSTOM_MILESTONE_COLS);
        return row ?? null;
    }
    static async restore(milestoneId, restoredBy, trx) {
        const q = trx ? trx('custom_milestones') : db('custom_milestones');
        const [row] = await q
            .where({ milestone_id: milestoneId })
            .whereNotNull('removed_at')
            .update({
            removed_by: null,
            removed_at: null,
            updated_by: restoredBy,
            updated_at: (trx || db).fn.now(),
        })
            .returning(CUSTOM_MILESTONE_COLS);
        return row ?? null;
    }
    static async hardDelete(milestoneId, trx) {
        const q = trx ? trx('custom_milestones') : db('custom_milestones');
        const count = await q.where({ milestone_id: milestoneId }).del();
        return count > 0;
    }
}
const SCHEDULE_VERSION_COLS = [
    'schedule_version_id', 'project_id', 'version_no', 'status', 'upload_kind', 'status_date',
    'source_file_id', 'tasks_added', 'tasks_removed', 'tasks_modified', 'pct_overwrites',
    'overdue_task_count', 'uploaded_by', 'uploaded_at', 'applied_at', 'notes',
];
export class ScheduleVersions {
    static async listApplied(projectId) {
        return db('schedule_version')
            .where({ project_id: projectId, status: 'applied' })
            .whereNull('deleted_at')
            .select(SCHEDULE_VERSION_COLS)
            .orderBy('version_no', 'desc');
    }
    /** What a given upload actually changed: every revision it introduced, classified by what
     *  moved (compared to the revision it closed, if any). Real per-upload history, not a diff
     *  between two arbitrary versions — AC-SCH-06/07 already record this at write time. */
    static async getChanges(projectId, versionId) {
        const rows = await db('schedule_task_revision as r')
            .join('schedule_task as t', 't.task_id', 'r.task_id')
            .leftJoin('schedule_task_revision as prev', function () {
            this.on('prev.task_id', '=', 'r.task_id').andOn('prev.valid_to', '=', 'r.valid_from');
        })
            .where('t.project_id', projectId)
            .andWhere('r.schedule_version_id', versionId)
            .andWhere('r.is_summary', false)
            .select('t.task_id', 'r.task_name', 'r.wbs', 'r.change_type', 'r.start', 'r.expected_finish', 'prev.start as prev_start', 'prev.expected_finish as prev_expected_finish')
            .orderBy('r.wbs', 'asc');
        return rows.map((row) => {
            if (row.change_type !== 'modified' || !row.prev_start) {
                return {
                    task_id: row.task_id,
                    task_name: row.task_name,
                    wbs: row.wbs,
                    change_type: row.change_type,
                    field: row.change_type === 'added' ? 'Task' : null,
                    change: row.change_type === 'added' ? 'New task' : 'Restored',
                };
            }
            const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            if (row.prev_expected_finish.getTime() !== row.expected_finish.getTime()) {
                return {
                    task_id: row.task_id,
                    task_name: row.task_name,
                    wbs: row.wbs,
                    change_type: 'modified',
                    field: 'Finish',
                    change: `${fmt(row.prev_expected_finish)} → ${fmt(row.expected_finish)}`,
                };
            }
            if (row.prev_start.getTime() !== row.start.getTime()) {
                return {
                    task_id: row.task_id,
                    task_name: row.task_name,
                    wbs: row.wbs,
                    change_type: 'modified',
                    field: 'Start',
                    change: `${fmt(row.prev_start)} → ${fmt(row.start)}`,
                };
            }
            return {
                task_id: row.task_id,
                task_name: row.task_name,
                wbs: row.wbs,
                change_type: 'modified',
                field: 'Updated',
                change: 'Progress or other fields updated',
            };
        });
    }
    /** The version a new upload is compared against: kind defaulting (AC-SCH-02) and the
     *  duplicate-file warning (AC-SCH-03) both read it. */
    static async latestApplied(projectId) {
        return db('schedule_version')
            .where({ project_id: projectId, status: 'applied' })
            .whereNull('deleted_at')
            .select([...SCHEDULE_VERSION_COLS, 'file_sha256'])
            .orderBy('version_no', 'desc')
            .first();
    }
    /** One version in any state, including queued, parsing and failed — what the upload screen
     *  polls while processing runs, and what AC-SCH-42 shows Planners for a failed upload. */
    static async getById(projectId, versionId) {
        return db('schedule_version')
            .where({ project_id: projectId, schedule_version_id: versionId })
            .whereNull('deleted_at')
            .select([...SCHEDULE_VERSION_COLS, 'file_sha256', 'parse_diagnostics'])
            .first();
    }
    static async hasInFlight(projectId) {
        const row = await db('schedule_version')
            .where({ project_id: projectId })
            .whereIn('status', ['queued', 'parsing'])
            .select('schedule_version_id')
            .first();
        return Boolean(row);
    }
    /** AC-SCH-01: queue an upload for the parser. version_no, counts and applied_at stay null
     *  until the apply transaction runs — the ck_sv_* checks tie them to status = 'applied'. */
    static async createQueued(input) {
        try {
            const [row] = await db('schedule_version')
                .insert({
                schedule_version_id: randomUUID(),
                project_id: input.project_id,
                status: 'queued',
                upload_kind: input.upload_kind,
                change_request_id: input.change_request_id ?? null,
                scope_mode: input.scope_mode,
                source_file_id: input.source_file_id,
                file_sha256: input.file_sha256,
                uploaded_by: input.uploaded_by,
                notes: input.notes ?? null,
            })
                .returning([...SCHEDULE_VERSION_COLS, 'file_sha256']);
            return row;
        }
        catch (err) {
            // ux_sv_one_inflight: another upload for this project is already queued or parsing.
            if (err.code === '23505') {
                throw new ScheduleUploadInFlightError();
            }
            throw err;
        }
    }
}
export class ScheduleUploadInFlightError extends Error {
    constructor() {
        super('An upload for this project is still being processed');
        this.name = 'ScheduleUploadInFlightError';
    }
}
const SCHEDULE_TASK_COLS = [
    't.task_id', 't.mpp_unique_id',
    'r.parent_task_id', 'r.outline_level', 'r.wbs', 'r.task_name', 'r.duration_minutes',
    'r.start', 'r.expected_finish', 'r.baseline_finish', 'r.actual_start', 'r.actual_finish',
    'r.pct_work_complete', 'r.planned_pct_complete',
    'r.is_milestone', 'r.is_summary', 'r.is_critical',
    'r.predecessors', 'r.resource_names', 'r.responsible_user_id',
];
/** "Where this task should be today" per AC-SCH-32: 0 before the planned window, 100 after,
 *  linear in calendar time between. Window = baseline_start/finish, falling back to
 *  start/expected_finish when not yet baselined (never null — every task has start/expected_finish).
 *  Milestones are binary. A function of "now", so always computed at read time, never stored. */
export const PLANNED_I_EXPR = `
  (CASE
    WHEN r.is_milestone THEN
      CASE WHEN COALESCE(r.baseline_finish, r.expected_finish) <= now() THEN 100 ELSE 0 END
    WHEN COALESCE(r.baseline_finish, r.expected_finish) <= COALESCE(r.baseline_start, r.start) THEN 100
    ELSE GREATEST(0, LEAST(100,
      EXTRACT(EPOCH FROM (now() - COALESCE(r.baseline_start, r.start)))
        / EXTRACT(EPOCH FROM (COALESCE(r.baseline_finish, r.expected_finish) - COALESCE(r.baseline_start, r.start)))
        * 100
    ))
  END)
`;
const PLANNED_PCT_SQL = `ROUND((${PLANNED_I_EXPR})::numeric, 2) as planned_pct`;
export class ScheduleTasks {
    /** One live task of this project: it exists, still has a current revision and has not been
     *  removed by a later upload. Used to check a risk's source_task_id before linking it. */
    static async getById(projectId, taskId) {
        return db('schedule_task as t')
            .join('schedule_task_revision as r', 'r.task_id', 't.task_id')
            .where({ 't.project_id': projectId, 't.task_id': taskId })
            .whereNull('r.valid_to')
            .whereNull('t.removed_in_version_id')
            .select('t.task_id')
            .first();
    }
    /** Current revision of every live task. Task identity (schedule_task) is permanent;
     *  "current" is simply the still-open revision (valid_to IS NULL) of a non-removed task. */
    static async listCurrent(projectId) {
        return db('schedule_task_revision as r')
            .join('schedule_task as t', 't.task_id', 'r.task_id')
            .where('t.project_id', projectId)
            .whereNull('r.valid_to')
            .whereNull('t.removed_in_version_id')
            .select(...SCHEDULE_TASK_COLS, db.raw("(r.is_summary = false AND r.pct_work_complete < 100 AND r.expected_finish < now()) as is_overdue"), db.raw(PLANNED_PCT_SQL))
            .orderBy('t.mpp_unique_id', 'asc');
    }
    /** Current revision of every live task, for building a fresh MS Project export (ScheduleBuilder)
     *  that reflects today's DB state — including write-backs a re-upload wouldn't know about.
     *  Dates come back as the project-local wall-clock strings MS Project originally wrote,
     *  reversing the `AT TIME ZONE` conversion scheduleProcessor applied on upload (see
     *  resolveLocalTimestamps), since that is the format the exporter's writer expects. */
    static async listCurrentForExport(projectId) {
        const local = (col, alias) => db.raw(`to_char(${col} AT TIME ZONE p.timezone, 'YYYY-MM-DD"T"HH24:MI:SS') as ${alias}`);
        return db('schedule_task_revision as r')
            .join('schedule_task as t', 't.task_id', 'r.task_id')
            .join('projects as p', 'p.project_id', 't.project_id')
            .leftJoin('schedule_task as parent', 'parent.task_id', 'r.parent_task_id')
            .where('t.project_id', projectId)
            .whereNull('r.valid_to')
            .whereNull('t.removed_in_version_id')
            .select('t.mpp_unique_id', 'parent.mpp_unique_id as parent_mpp_unique_id', 'r.outline_level', 'r.wbs', 'r.task_name', 'r.duration_minutes', local('r.start', 'start'), local('r.expected_finish', 'expected_finish'), 
        // to_char of a NULL timestamp is NULL, so these fall through correctly unbaselined/not-yet-actual.
        local('r.baseline_start', 'baseline_start'), local('r.baseline_finish', 'baseline_finish'), local('r.actual_start', 'actual_start'), local('r.actual_finish', 'actual_finish'), 'r.pct_work_complete', 'r.planned_pct_complete', 'r.is_milestone', 'r.is_summary', 'r.is_critical', 'r.is_active', 'r.task_type', 'r.predecessors', 'r.resource_names')
            .orderBy('t.mpp_unique_id', 'asc');
    }
    /**
     * AC-SCH-20, and the list the PM works from: tasks past their expected finish and not
     * finished. "Past" is a project-local calendar question — a task due today is not overdue
     * at 09:00 just because the server is in UTC — so the comparison runs in the project's zone.
     *
     * Each task appears once. A task can carry several risks over time (one closed, another
     * raised after the planner moved it), so the one that still covers it is picked first — an
     * open risk if there is one, else the most recently raised — and the Overdue tab reads
     * "covered" straight off that status (AC-SCH-23 closes a risk once its task catches up; the
     * PM can raise a fresh one if the same task falls overdue again).
     */
    static async listOverdue(projectId) {
        const { rows } = await db.raw(`
      SELECT ${SCHEDULE_TASK_COLS.join(', ')},
             k.risk_id,
             k.status AS risk_status,
             ${PLANNED_PCT_SQL}
      FROM schedule_task_revision r
      JOIN schedule_task t ON t.task_id = r.task_id
      JOIN projects p ON p.project_id = t.project_id
      LEFT JOIN LATERAL (
        SELECT risk_id, status
        FROM risk
        WHERE source_task_id = t.task_id AND source = 'overdue_task'
        ORDER BY (status = 'open') DESC, opened_at DESC
        LIMIT 1
      ) k ON true
      WHERE t.project_id = :projectId
        AND r.valid_to IS NULL
        AND t.removed_in_version_id IS NULL
        AND r.is_summary = false
        AND r.is_active = true
        AND r.pct_work_complete < 100
        AND (r.expected_finish AT TIME ZONE p.timezone)::date < (now() AT TIME ZONE p.timezone)::date
      ORDER BY r.expected_finish ASC
      `, { projectId });
        return rows;
    }
}
export class ScheduleReconciliationFlags {
    static async list({ projectId, includeAcknowledged = false, page = 1, limit = 50, }) {
        const base = db('schedule_reconciliation_flag as f')
            .join('schedule_task_revision as ow', 'ow.revision_id', 'f.overwritten_revision_id')
            .join('schedule_task_revision as cur', 'cur.revision_id', 'f.overwriting_revision_id')
            .join('schedule_task as t', 't.task_id', 'f.task_id')
            .where('f.project_id', projectId);
        if (!includeAcknowledged)
            base.whereNull('f.acknowledged_at');
        const countRows = await base.clone().count('f.flag_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const flags = await base
            .clone()
            .select('f.flag_id', 't.task_id', 't.mpp_unique_id', 'cur.task_name', 
        // "DPR says" is the write-back the Planner's upload overwrote; "Schedule says" is what the upload set it to.
        'ow.pct_work_complete as dpr_pct', 'cur.pct_work_complete as schedule_pct', 'ow.responsible_user_id as reported_by', 'ow.valid_from as reported_at', 'f.created_at', 'f.acknowledged_at', 'f.acknowledged_by')
            .orderBy('f.created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { flags, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } };
    }
    static async acknowledge(projectId, flagIds, userId) {
        return db('schedule_reconciliation_flag')
            .where({ project_id: projectId })
            .whereIn('flag_id', flagIds)
            .whereNull('acknowledged_at')
            .update({ acknowledged_at: db.fn.now(), acknowledged_by: userId });
    }
}
const DPR_COLS = [
    'dpr_id',
    'dpr_ref',
    'project_id',
    'stage_no',
    'report_date',
    'site_location',
    'contract_no',
    'weather_category_id',
    'temp_min_c',
    'temp_max_c',
    'humidity_pct',
    'wind',
    'effects_text',
    'effects_severity',
    'equipment_text',
    'visitors_text',
    'delays_text',
    'incidents_text',
    'materials_rejected_text',
    'other_notes_text',
    'status',
    'author_id',
    'submitted_by',
    'submitted_at',
    'is_late',
    'created_at',
    'updated_at',
];
function formatDprRef(reportDate, projectCode, seq) {
    const d = new Date(reportDate);
    const yy = String(d.getUTCFullYear()).slice(-2);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const yymmdd = `${yy}${mm}${dd}`;
    const match = projectCode.match(/^(\d{3})-/);
    const ppp = match ? match[1] : '001';
    const nnn = String(seq).padStart(3, '0');
    return `DPR-${yymmdd}-${ppp}-${nnn}`;
}
function computeIsLate(submittedAt, reportDateStr, timezone = 'Africa/Nairobi') {
    try {
        const localDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(submittedAt);
        const localTimeStr = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(submittedAt);
        if (localDateStr > reportDateStr) {
            return true;
        }
        if (localDateStr === reportDateStr && localTimeStr > '23:00:00') {
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
export class Dprs {
    static async create(input, trx) {
        const execute = async (t) => {
            const dprId = input.dpr_id ?? randomUUID();
            const isSubmitting = input.status === 'submitted';
            let dprRef = null;
            let submittedAt = null;
            let submittedBy = null;
            let isLate = null;
            if (isSubmitting) {
                const project = await t('projects').where({ project_id: input.project_id }).first();
                const countRes = await t('dpr')
                    .where({ project_id: input.project_id, status: 'submitted' })
                    .count('dpr_id as count');
                const seq = Number(countRes[0]?.count ?? 0) + 1;
                dprRef = formatDprRef(input.report_date, project?.project_code ?? '001', seq);
                submittedAt = new Date();
                submittedBy = input.author_id;
                isLate = computeIsLate(submittedAt, input.report_date, project?.timezone ?? 'Africa/Nairobi');
            }
            const [row] = await t('dpr')
                .insert({
                dpr_id: dprId,
                dpr_ref: dprRef,
                project_id: input.project_id,
                stage_no: input.stage_no,
                report_date: input.report_date,
                site_location: input.site_location,
                contract_no: input.contract_no ?? null,
                weather_category_id: input.weather_category_id ?? null,
                temp_min_c: input.temp_min_c ?? null,
                temp_max_c: input.temp_max_c ?? null,
                humidity_pct: input.humidity_pct ?? null,
                wind: input.wind ?? null,
                effects_text: input.effects_text ?? null,
                effects_severity: input.effects_severity ?? 'none',
                equipment_text: input.equipment_text ?? null,
                visitors_text: input.visitors_text ?? null,
                delays_text: input.delays_text ?? null,
                incidents_text: input.incidents_text ?? null,
                materials_rejected_text: input.materials_rejected_text ?? null,
                other_notes_text: input.other_notes_text ?? null,
                status: input.status ?? 'draft',
                author_id: input.author_id,
                submitted_by: submittedBy,
                submitted_at: submittedAt,
                is_late: isLate,
            })
                .returning(DPR_COLS);
            // Child sections
            if (input.work_items && input.work_items.length > 0) {
                const workItems = input.work_items.map((w, idx) => ({
                    work_item_id: w.work_item_id ?? randomUUID(),
                    dpr_id: dprId,
                    sort_order: w.sort_order ?? idx,
                    work_area: w.work_area,
                    work_carried_out: w.work_carried_out,
                }));
                await t('dpr_work_item').insert(workItems);
            }
            if (input.activity_progress && input.activity_progress.length > 0) {
                const activities = input.activity_progress.map((a, idx) => ({
                    dpr_activity_progress_id: a.dpr_activity_progress_id ?? randomUUID(),
                    dpr_id: dprId,
                    sort_order: a.sort_order ?? idx,
                    source: a.source,
                    task_id: a.task_id ?? null,
                    free_text: a.free_text ?? null,
                    today_pct: a.today_pct,
                    total_pct: a.total_pct,
                }));
                await t('dpr_activity_progress').insert(activities);
            }
            if (input.personnel_groups && input.personnel_groups.length > 0) {
                for (const [idx, group] of input.personnel_groups.entries()) {
                    const groupId = group.personnel_group_id ?? randomUUID();
                    await t('dpr_personnel_group').insert({
                        personnel_group_id: groupId,
                        dpr_id: dprId,
                        project_contractor_id: group.project_contractor_id,
                        sort_order: group.sort_order ?? idx,
                        total_headcount: group.total_headcount,
                    });
                    if (group.role_counts && group.role_counts.length > 0) {
                        const roleCounts = group.role_counts.map((rc) => ({
                            personnel_group_id: groupId,
                            personnel_role_id: rc.personnel_role_id,
                            headcount: rc.headcount,
                        }));
                        await t('dpr_personnel_role_count').insert(roleCounts);
                    }
                }
            }
            if (input.photos && input.photos.length > 0) {
                const photos = input.photos.map((p, idx) => ({
                    photo_id: p.photo_id ?? randomUUID(),
                    dpr_id: dprId,
                    file_id: p.file_id,
                    caption: p.caption ?? null,
                    sort_order: p.sort_order ?? idx,
                    taken_at: p.taken_at ? new Date(p.taken_at) : null,
                    gps_lat: p.gps_lat ?? null,
                    gps_lng: p.gps_lng ?? null,
                    uploaded_by: p.uploaded_by ?? input.author_id,
                }));
                await t('dpr_photo').insert(photos);
            }
            return (await Dprs.getById(dprId, input.project_id, t));
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async getById(dprId, projectId, trx) {
        const q = trx ? trx('dpr') : db('dpr');
        q.where({ dpr_id: dprId });
        if (projectId) {
            q.andWhere({ project_id: projectId });
        }
        const dpr = await q.first();
        if (!dpr)
            return null;
        const t = trx || db;
        const [workItems, activityProgress, personnelGroups, photos, users, weatherCategory] = await Promise.all([
            t('dpr_work_item').where({ dpr_id: dprId }).orderBy('sort_order', 'asc'),
            t('dpr_activity_progress as dap')
                .leftJoin('schedule_task_revision as str', function () {
                this.on('str.task_id', '=', 'dap.task_id').andOnNull('str.valid_to');
            })
                .where({ 'dap.dpr_id': dprId })
                .whereNull('dap.removed_at')
                .select('dap.*', 'str.task_name')
                .orderBy('dap.sort_order', 'asc'),
            t('dpr_personnel_group as dpg')
                .join('project_contractor as pc', 'dpg.project_contractor_id', 'pc.project_contractor_id')
                .join('contractor as c', 'pc.contractor_id', 'c.contractor_id')
                .where({ 'dpg.dpr_id': dprId })
                .select('dpg.*', 'c.name as contractor_name', 'pc.party_type')
                .orderBy('dpg.sort_order', 'asc'),
            t('dpr_photo as dp')
                .join('file_object as fo', 'fo.file_id', 'dp.file_id')
                .where({ 'dp.dpr_id': dprId })
                .select('dp.*', 'fo.storage_key', 'fo.mime_type')
                .orderBy('dp.sort_order', 'asc'),
            t('users')
                .whereIn('id', [dpr.author_id, dpr.submitted_by].filter(Boolean))
                .select('id', db.raw("NULLIF(CONCAT(first_name, ' ', last_name), ' ') as name")),
            dpr.weather_category_id
                ? t('weather_category').where({ weather_category_id: dpr.weather_category_id }).first()
                : null,
        ]);
        // Attach role counts to personnel groups
        const groupIds = personnelGroups.map((g) => g.personnel_group_id);
        let roleCounts = [];
        if (groupIds.length > 0) {
            roleCounts = await t('dpr_personnel_role_count as prc')
                .join('personnel_role as pr', 'pr.personnel_role_id', 'prc.personnel_role_id')
                .whereIn('prc.personnel_group_id', groupIds)
                .select('prc.*', 'pr.name as role_name');
        }
        const groupsWithRoles = personnelGroups.map((g) => ({
            ...g,
            role_counts: roleCounts.filter((rc) => rc.personnel_group_id === g.personnel_group_id),
        }));
        const nameById = new Map(users.map((u) => [u.id, u.name]));
        const photosWithUrls = photos.map((p) => ({
            ...p,
            url: objectUrl({ storage_key: p.storage_key, mime_type: p.mime_type }),
        }));
        return {
            ...dpr,
            work_items: workItems,
            activity_progress: activityProgress,
            personnel_groups: groupsWithRoles,
            photos: photosWithUrls,
            weather_category_name: weatherCategory?.name ?? null,
            author_name: nameById.get(dpr.author_id),
            submitted_by_name: dpr.submitted_by ? nameById.get(dpr.submitted_by) ?? null : null,
        };
    }
    static async getByProjectAndDate(projectId, reportDate, trx) {
        const q = trx ? trx('dpr') : db('dpr');
        const row = await q.where({ project_id: projectId, report_date: reportDate }).first();
        return row ?? null;
    }
    static async list({ projectId, stageNo, status, fromDate, toDate, authorId, page = 1, limit = 25, visibleToUserId, isAdmin = false, }) {
        const query = db('dpr').where({ project_id: projectId });
        // AC-DPR-01: Drafts are visible only to their author and Admins
        if (!isAdmin && visibleToUserId) {
            query.andWhere((qb) => {
                qb.where('status', 'submitted').orWhere((subQb) => {
                    subQb.where('status', 'draft').andWhere('author_id', visibleToUserId);
                });
            });
        }
        if (stageNo !== undefined) {
            query.andWhere({ stage_no: stageNo });
        }
        if (status !== undefined) {
            query.andWhere({ status });
        }
        if (fromDate) {
            query.andWhere('report_date', '>=', fromDate);
        }
        if (toDate) {
            query.andWhere('report_date', '<=', toDate);
        }
        if (authorId) {
            query.andWhere({ author_id: authorId });
        }
        const countRes = await query.clone().count('dpr_id as count');
        const total = Number(countRes[0]?.count ?? 0);
        const totalPages = Math.ceil(total / limit) || 1;
        const dprs = await query
            .select(DPR_COLS)
            .orderBy('report_date', 'desc')
            .offset((page - 1) * limit)
            .limit(limit);
        return {
            dprs,
            pagination: { page, limit, total, totalPages },
        };
    }
    /**
     * The "expected DPR day" definition from `docs/app-constraints.md` (§15.4), inclusive of both
     * ends: day D is expected when `extract(isodow from D)` is in `project.dpr_expected_weekdays`,
     * Stage 7 was active on D per `stage_state_history`, D is not a `holiday` on the project's
     * calendar unless a `project_calendar_exception` marks it `is_working_day = true`, and no
     * exception marks it `is_working_day = false`.
     *
     * The stage-7 condition applies only from the first recorded stage event onwards. Stage history
     * started being written long after the first DPRs were filed, so for earlier days there is no
     * event to read and "was it active?" is unanswerable; treating that as "not expected" would
     * print rows like "5 filed of 0 expected" on the client report. Before a project's first stage
     * event the weekday/holiday rules stand alone.
     */
    static async expectedDates(projectId, fromDate, toDate) {
        const { rows } = await db.raw(`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day
      FROM projects p
      CROSS JOIN LATERAL generate_series(:fromDate::date, :toDate::date, interval '1 day') AS d(day)
      LEFT JOIN project_calendar_exception e
             ON e.project_id = p.project_id AND e.exception_date = d.day::date
      LEFT JOIN holiday h
             ON h.calendar_id = p.holiday_calendar_id AND h.holiday_date = d.day::date
      WHERE p.project_id = :projectId
        AND EXTRACT(ISODOW FROM d.day)::smallint = ANY (p.dpr_expected_weekdays)
        AND COALESCE(e.is_working_day, true) = true
        AND (h.holiday_date IS NULL OR e.is_working_day = true)
        AND (
              NOT EXISTS (SELECT 1
                            FROM stage_state_history s0
                           WHERE s0.project_id = p.project_id
                             AND s0.stage_no = 7
                             AND (s0.occurred_at AT TIME ZONE p.timezone)::date <= d.day::date)
              OR (SELECT s.to_state::text
                    FROM stage_state_history s
                   WHERE s.project_id = p.project_id
                     AND s.stage_no = 7
                     AND (s.occurred_at AT TIME ZONE p.timezone)::date <= d.day::date
                   ORDER BY s.occurred_at DESC
                   LIMIT 1) = 'active'
            )
      ORDER BY d.day
      `, { projectId, fromDate, toDate });
        return rows.map((row) => row.day);
    }
    /** Expected days (above) with no DPR filed. `toDate` is exclusive here: the caller passes
     *  today, and today's DPR is not late yet. */
    static async missingWeekdays(projectId, fromDate, toDate) {
        const expected = await Dprs.expectedDates(projectId, fromDate, toDate);
        const existingRows = await db('dpr')
            .where({ project_id: projectId })
            .andWhere('report_date', '>=', fromDate)
            .andWhere('report_date', '<', toDate)
            .select('report_date');
        const existing = new Set(existingRows.map((row) => String(row.report_date).slice(0, 10)));
        return expected.filter((date) => date < toDate && !existing.has(date));
    }
    static async update(dprId, patch, trx) {
        const execute = async (t) => {
            const existing = await t('dpr').where({ dpr_id: dprId }).first();
            if (!existing)
                return null;
            const headerUpdate = {
                updated_at: t.fn.now(),
            };
            if (patch.stage_no !== undefined)
                headerUpdate.stage_no = patch.stage_no;
            if (patch.report_date !== undefined)
                headerUpdate.report_date = patch.report_date;
            if (patch.site_location !== undefined)
                headerUpdate.site_location = patch.site_location;
            if (patch.contract_no !== undefined)
                headerUpdate.contract_no = patch.contract_no;
            if (patch.weather_category_id !== undefined)
                headerUpdate.weather_category_id = patch.weather_category_id;
            if (patch.temp_min_c !== undefined)
                headerUpdate.temp_min_c = patch.temp_min_c;
            if (patch.temp_max_c !== undefined)
                headerUpdate.temp_max_c = patch.temp_max_c;
            if (patch.humidity_pct !== undefined)
                headerUpdate.humidity_pct = patch.humidity_pct;
            if (patch.wind !== undefined)
                headerUpdate.wind = patch.wind;
            if (patch.effects_text !== undefined)
                headerUpdate.effects_text = patch.effects_text;
            if (patch.effects_severity !== undefined)
                headerUpdate.effects_severity = patch.effects_severity;
            if (patch.equipment_text !== undefined)
                headerUpdate.equipment_text = patch.equipment_text;
            if (patch.visitors_text !== undefined)
                headerUpdate.visitors_text = patch.visitors_text;
            if (patch.delays_text !== undefined)
                headerUpdate.delays_text = patch.delays_text;
            if (patch.incidents_text !== undefined)
                headerUpdate.incidents_text = patch.incidents_text;
            if (patch.materials_rejected_text !== undefined)
                headerUpdate.materials_rejected_text = patch.materials_rejected_text;
            if (patch.other_notes_text !== undefined)
                headerUpdate.other_notes_text = patch.other_notes_text;
            await t('dpr').where({ dpr_id: dprId }).update(headerUpdate);
            // Child sections replacements if provided
            if (patch.work_items !== undefined) {
                await t('dpr_work_item').where({ dpr_id: dprId }).del();
                if (patch.work_items.length > 0) {
                    const items = patch.work_items.map((w, idx) => ({
                        work_item_id: w.work_item_id ?? randomUUID(),
                        dpr_id: dprId,
                        sort_order: w.sort_order ?? idx,
                        work_area: w.work_area,
                        work_carried_out: w.work_carried_out,
                    }));
                    await t('dpr_work_item').insert(items);
                }
            }
            if (patch.activity_progress !== undefined) {
                const existingRows = await t('dpr_activity_progress')
                    .where({ dpr_id: dprId })
                    .whereNull('removed_at')
                    .select('dpr_activity_progress_id');
                const existingIds = existingRows.map((row) => row.dpr_activity_progress_id);
                const linkedIds = existingIds.length
                    ? (await t('schedule_task_revision')
                        .whereIn('dpr_activity_progress_id', existingIds)
                        .whereNotNull('dpr_activity_progress_id')
                        .distinct('dpr_activity_progress_id')
                        .select('dpr_activity_progress_id')).map((row) => row.dpr_activity_progress_id)
                    : [];
                const linkedSet = new Set(linkedIds);
                if (linkedIds.length > 0) {
                    await t('dpr_activity_progress')
                        .whereIn('dpr_activity_progress_id', linkedIds)
                        .update({ removed_at: t.fn.now() });
                }
                const removableIds = existingIds.filter((id) => !linkedSet.has(id));
                if (removableIds.length > 0) {
                    await t('dpr_activity_progress').whereIn('dpr_activity_progress_id', removableIds).del();
                }
                if (patch.activity_progress.length > 0) {
                    const activities = patch.activity_progress.map((a, idx) => ({
                        dpr_activity_progress_id: a.dpr_activity_progress_id && !linkedSet.has(a.dpr_activity_progress_id)
                            ? a.dpr_activity_progress_id
                            : randomUUID(),
                        dpr_id: dprId,
                        sort_order: a.sort_order ?? idx,
                        source: a.source,
                        task_id: a.task_id ?? null,
                        free_text: a.free_text ?? null,
                        today_pct: a.today_pct,
                        total_pct: a.total_pct,
                    }));
                    await t('dpr_activity_progress').insert(activities);
                }
            }
            if (patch.personnel_groups !== undefined) {
                await t('dpr_personnel_group').where({ dpr_id: dprId }).del();
                if (patch.personnel_groups.length > 0) {
                    for (const [idx, group] of patch.personnel_groups.entries()) {
                        const groupId = group.personnel_group_id ?? randomUUID();
                        await t('dpr_personnel_group').insert({
                            personnel_group_id: groupId,
                            dpr_id: dprId,
                            project_contractor_id: group.project_contractor_id,
                            sort_order: group.sort_order ?? idx,
                            total_headcount: group.total_headcount,
                        });
                        if (group.role_counts && group.role_counts.length > 0) {
                            const roleCounts = group.role_counts.map((rc) => ({
                                personnel_group_id: groupId,
                                personnel_role_id: rc.personnel_role_id,
                                headcount: rc.headcount,
                            }));
                            await t('dpr_personnel_role_count').insert(roleCounts);
                        }
                    }
                }
            }
            if (patch.photos !== undefined) {
                await t('dpr_photo').where({ dpr_id: dprId }).del();
                if (patch.photos.length > 0) {
                    const photos = patch.photos.map((p, idx) => ({
                        photo_id: p.photo_id ?? randomUUID(),
                        dpr_id: dprId,
                        file_id: p.file_id,
                        caption: p.caption ?? null,
                        sort_order: p.sort_order ?? idx,
                        taken_at: p.taken_at ? new Date(p.taken_at) : null,
                        gps_lat: p.gps_lat ?? null,
                        gps_lng: p.gps_lng ?? null,
                        uploaded_by: p.uploaded_by ?? existing.author_id,
                    }));
                    await t('dpr_photo').insert(photos);
                }
            }
            // AC-DPR-08 / AC-SCH-16: a same-day edit to an already-submitted DPR writes back too,
            // but only if the schedule hasn't moved on since the original submit.
            if (patch.activity_progress !== undefined && existing.status === 'submitted' && existing.submitted_at) {
                const project = await t('projects').where({ project_id: existing.project_id }).first('timezone');
                await writebackDprActivityProgress(t, {
                    dprId,
                    projectId: existing.project_id,
                    dprSubmittedAt: new Date(existing.submitted_at),
                    timezone: project?.timezone ?? 'Africa/Nairobi',
                    enforceStaleRule: true,
                });
            }
            return await Dprs.getById(dprId, existing.project_id, t);
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async submit(dprId, submittedBy, trx) {
        const execute = async (t) => {
            const dpr = await t('dpr').where({ dpr_id: dprId }).first();
            if (!dpr) {
                throw new Error('DPR not found');
            }
            if (dpr.status === 'submitted') {
                throw new Error('DPR has already been submitted');
            }
            const project = await t('projects').where({ project_id: dpr.project_id }).first();
            const countRes = await t('dpr')
                .where({ project_id: dpr.project_id, status: 'submitted' })
                .count('dpr_id as count');
            const seq = Number(countRes[0]?.count ?? 0) + 1;
            const dprRef = formatDprRef(dpr.report_date, project?.project_code ?? '001', seq);
            const submittedAt = new Date();
            const isLate = computeIsLate(submittedAt, dpr.report_date, project?.timezone ?? 'Africa/Nairobi');
            await t('dpr')
                .where({ dpr_id: dprId })
                .update({
                status: 'submitted',
                dpr_ref: dprRef,
                submitted_by: submittedBy,
                submitted_at: submittedAt,
                is_late: isLate,
                updated_at: t.fn.now(),
            });
            // AC-SCH-15: the initial submit always writes back, no staleness check.
            await writebackDprActivityProgress(t, {
                dprId,
                projectId: dpr.project_id,
                dprSubmittedAt: submittedAt,
                timezone: project?.timezone ?? 'Africa/Nairobi',
                enforceStaleRule: false,
            });
            return (await Dprs.getById(dprId, dpr.project_id, t));
        };
        return trx ? await execute(trx) : await db.transaction(execute);
    }
    static async prefill(projectId) {
        const lastDpr = await db('dpr')
            .where({ project_id: projectId, status: 'submitted' })
            .orderBy('report_date', 'desc')
            .first();
        if (!lastDpr)
            return null;
        const groups = await db('dpr_personnel_group as dpg')
            .join('project_contractor as pc', 'dpg.project_contractor_id', 'pc.project_contractor_id')
            .join('contractor as c', 'pc.contractor_id', 'c.contractor_id')
            .where({ 'dpg.dpr_id': lastDpr.dpr_id, 'pc.is_active': true })
            .select('dpg.project_contractor_id', 'c.name as contractor_name', 'pc.party_type', 'dpg.sort_order')
            .orderBy('dpg.sort_order', 'asc');
        return {
            site_location: lastDpr.site_location,
            contract_no: lastDpr.contract_no,
            personnel_groups: groups,
        };
    }
    static async delete(dprId, trx) {
        const q = trx ? trx('dpr') : db('dpr');
        const count = await q.where({ dpr_id: dprId }).del();
        return count > 0;
    }
}
export class DprAmendments {
    static async create(input) {
        return db.transaction(async (trx) => {
            const dpr = await trx('dpr').where({ dpr_id: input.dprId }).forUpdate().first();
            if (!dpr || dpr.status !== 'submitted') {
                throw new Error('Amendments can only be requested for submitted DPRs');
            }
            const pending = await trx('dpr_amendment')
                .where({ dpr_id: input.dprId, status: 'pending' })
                .first('amendment_id');
            if (pending)
                throw new Error('A pending amendment request already exists for this DPR');
            const count = await trx('dpr_amendment')
                .where({ dpr_id: input.dprId })
                .max('amendment_no as max')
                .first();
            const amendmentId = randomUUID();
            const [row] = await trx('dpr_amendment')
                .insert({
                amendment_id: amendmentId,
                dpr_id: input.dprId,
                amendment_no: Number(count?.max ?? 0) + 1,
                reason: input.reason,
                proposed_document: JSON.stringify(input.proposedDocument),
                status: 'pending',
                requested_by: input.requestedBy,
            })
                .returning('*');
            await trx('audit_event').insert({
                occurred_at: new Date(),
                actor_id: input.requestedBy,
                channel: 'web',
                correlation_id: randomUUID(),
                project_id: dpr.project_id,
                entity_type: 'dpr_amendment',
                entity_id: amendmentId,
                action: 'dpr.amendment.requested',
                after_json: JSON.stringify({ dpr_id: input.dprId, status: 'pending' }),
                reason: input.reason,
            });
            return row;
        });
    }
    static async list(projectId, options = {}) {
        const query = db('dpr_amendment as da')
            .join('dpr as d', 'd.dpr_id', 'da.dpr_id')
            .leftJoin('users as u', 'u.id', 'da.requested_by')
            .where('d.project_id', projectId)
            .select('da.*', 'd.dpr_ref', 'd.report_date', 'd.site_location', db.raw("NULLIF(CONCAT(u.first_name, ' ', u.last_name), ' ') as requester_name"))
            .orderBy('da.requested_at', 'desc');
        if (options.status)
            query.andWhere('da.status', options.status);
        if (options.requestedBy)
            query.andWhere('da.requested_by', options.requestedBy);
        return query;
    }
    static async decide(input) {
        return db.transaction(async (trx) => {
            const amendment = await trx('dpr_amendment as da')
                .join('dpr as d', 'd.dpr_id', 'da.dpr_id')
                .where({ 'da.amendment_id': input.amendmentId, 'd.project_id': input.projectId })
                .forUpdate()
                .select('da.*', 'd.project_id', 'd.submitted_at')
                .first();
            if (!amendment || amendment.status !== 'pending')
                return null;
            let beforeSnapshot = null;
            let appliedAt = null;
            let writebackOutcome = null;
            if (input.decision === 'approve') {
                const current = await Dprs.getById(amendment.dpr_id, input.projectId, trx);
                if (!current)
                    throw new Error('DPR not found');
                beforeSnapshot = current;
                const proposed = amendment.proposed_document;
                const { activity_progress: activityProgress, ...headerAndSections } = proposed;
                await Dprs.update(amendment.dpr_id, headerAndSections, trx);
                if (activityProgress !== undefined) {
                    const activeRows = await trx('dpr_activity_progress')
                        .where({ dpr_id: amendment.dpr_id })
                        .whereNull('removed_at')
                        .select('dpr_activity_progress_id');
                    const activeIds = activeRows.map((row) => row.dpr_activity_progress_id);
                    const linkedIds = activeIds.length
                        ? (await trx('schedule_task_revision')
                            .whereIn('dpr_activity_progress_id', activeIds)
                            .whereNotNull('dpr_activity_progress_id')
                            .distinct('dpr_activity_progress_id')
                            .select('dpr_activity_progress_id')).map((row) => row.dpr_activity_progress_id)
                        : [];
                    const linkedSet = new Set(linkedIds);
                    if (linkedIds.length > 0) {
                        await trx('dpr_activity_progress')
                            .whereIn('dpr_activity_progress_id', linkedIds)
                            .update({ removed_at: trx.fn.now() });
                    }
                    const removableIds = activeIds.filter((id) => !linkedSet.has(id));
                    if (removableIds.length > 0) {
                        await trx('dpr_activity_progress')
                            .whereIn('dpr_activity_progress_id', removableIds)
                            .del();
                    }
                    if (activityProgress.length > 0) {
                        await trx('dpr_activity_progress').insert(activityProgress.map((activity, index) => ({
                            dpr_activity_progress_id: randomUUID(),
                            dpr_id: amendment.dpr_id,
                            sort_order: activity.sort_order ?? index,
                            source: activity.source,
                            task_id: activity.task_id ?? null,
                            free_text: activity.free_text ?? null,
                            today_pct: activity.today_pct,
                            total_pct: activity.total_pct,
                        })));
                    }
                    const project = await trx('projects')
                        .where({ project_id: input.projectId })
                        .first('timezone');
                    const staleUpload = amendment.submitted_at
                        ? await trx('schedule_version')
                            .where({ project_id: input.projectId, status: 'applied' })
                            .andWhere('applied_at', '>', amendment.submitted_at)
                            .first('schedule_version_id')
                        : null;
                    const { written } = await writebackDprActivityProgress(trx, {
                        dprId: amendment.dpr_id,
                        projectId: input.projectId,
                        dprSubmittedAt: new Date(amendment.submitted_at),
                        timezone: project?.timezone ?? 'Africa/Nairobi',
                        enforceStaleRule: true,
                    });
                    writebackOutcome = staleUpload
                        ? 'skipped_stale_schedule'
                        : written > 0
                            ? 'applied'
                            : 'no_change';
                }
                else {
                    writebackOutcome = 'no_change';
                }
                appliedAt = new Date();
            }
            const status = input.decision === 'approve' ? 'approved' : 'rejected';
            const [updated] = await trx('dpr_amendment')
                .where({ amendment_id: input.amendmentId, status: 'pending' })
                .update({
                status,
                decided_by: input.decidedBy,
                decided_at: trx.fn.now(),
                decision_note: input.decisionNote ?? null,
                before_snapshot: beforeSnapshot ? JSON.stringify(beforeSnapshot) : null,
                applied_at: appliedAt,
                writeback_outcome: writebackOutcome,
            })
                .returning('*');
            if (!updated)
                return null;
            await trx('audit_event').insert({
                occurred_at: new Date(),
                actor_id: input.decidedBy,
                channel: 'web',
                correlation_id: randomUUID(),
                project_id: input.projectId,
                entity_type: 'dpr_amendment',
                entity_id: input.amendmentId,
                action: `dpr.amendment.${status}`,
                before_json: JSON.stringify({ status: 'pending' }),
                after_json: JSON.stringify({ status, writeback_outcome: writebackOutcome }),
                reason: input.decisionNote ?? null,
            });
            return updated;
        });
    }
}
const ESCALATION_COLS = [
    'escalation_id',
    'submission_id',
    'project_id',
    'status',
    'acknowledged_by',
    'acknowledged_at',
    'resolved_by',
    'resolved_at',
    'created_at',
];
export class Escalations {
    static async create(input, trx) {
        const q = trx ? trx('escalation') : db('escalation');
        const [row] = await q
            .insert({
            escalation_id: input.escalation_id ?? randomUUID(),
            submission_id: input.submission_id,
            project_id: input.project_id,
            status: input.status ?? 'open',
            acknowledged_by: input.acknowledged_by ?? null,
            acknowledged_at: input.acknowledged_at ?? null,
            resolved_by: input.resolved_by ?? null,
            resolved_at: input.resolved_at ?? null,
        })
            .returning(ESCALATION_COLS);
        return row;
    }
    static async list({ projectId, status, page = 1, limit = 25, }, trx) {
        const q = trx ? trx('escalation') : db('escalation');
        const base = q;
        if (projectId)
            base.where('escalation.project_id', projectId);
        if (status)
            base.where('escalation.status', status);
        const countRows = await base.clone().count('escalation.escalation_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const rows = await base
            .clone()
            .leftJoin('weekly_submission', 'escalation.submission_id', 'weekly_submission.submission_id')
            .leftJoin('users as ack_u', 'escalation.acknowledged_by', 'ack_u.id')
            .leftJoin('users as res_u', 'escalation.resolved_by', 'res_u.id')
            .leftJoin('users as raiser_u', 'weekly_submission.created_by', 'raiser_u.id')
            .select('escalation.*', 'weekly_submission.escalation_reason', 'weekly_submission.week_start', 'weekly_submission.status as submission_status', 'weekly_submission.created_by as raiser_id', db.raw("NULLIF(CONCAT(ack_u.first_name, ' ', ack_u.last_name), ' ') as acknowledged_by_name"), db.raw("NULLIF(CONCAT(res_u.first_name, ' ', res_u.last_name), ' ') as resolved_by_name"), db.raw("NULLIF(CONCAT(raiser_u.first_name, ' ', raiser_u.last_name), ' ') as raiser_name"), db.raw('(SELECT COUNT(*)::int FROM escalation_response WHERE escalation_response.escalation_id = escalation.escalation_id) as response_count'))
            .orderBy('escalation.created_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);
        return {
            escalations: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
    }
    static async getById(escalationId, projectId, trx) {
        const q = trx ? trx('escalation') : db('escalation');
        let query = q
            .leftJoin('weekly_submission', 'escalation.submission_id', 'weekly_submission.submission_id')
            .leftJoin('users as ack_u', 'escalation.acknowledged_by', 'ack_u.id')
            .leftJoin('users as res_u', 'escalation.resolved_by', 'res_u.id')
            .leftJoin('users as raiser_u', 'weekly_submission.created_by', 'raiser_u.id')
            .where('escalation.escalation_id', escalationId);
        if (projectId) {
            query = query.andWhere('escalation.project_id', projectId);
        }
        const row = await query
            .select('escalation.*', 'weekly_submission.escalation_reason', 'weekly_submission.week_start', 'weekly_submission.status as submission_status', 'weekly_submission.created_by as raiser_id', db.raw("NULLIF(CONCAT(ack_u.first_name, ' ', ack_u.last_name), ' ') as acknowledged_by_name"), db.raw("NULLIF(CONCAT(res_u.first_name, ' ', res_u.last_name), ' ') as resolved_by_name"), db.raw("NULLIF(CONCAT(raiser_u.first_name, ' ', raiser_u.last_name), ' ') as raiser_name"), db.raw('(SELECT COUNT(*)::int FROM escalation_response WHERE escalation_response.escalation_id = escalation.escalation_id) as response_count'))
            .first();
        return row ?? null;
    }
    static async getBySubmissionId(submissionId, trx) {
        const q = trx ? trx('escalation') : db('escalation');
        const row = await q.where('submission_id', submissionId).first();
        return row ?? null;
    }
    static async acknowledge({ escalationId, projectId, userId, note, }) {
        return await db.transaction(async (trx) => {
            let query = trx('escalation').where({ escalation_id: escalationId, status: 'open' });
            if (projectId) {
                query = query.andWhere({ project_id: projectId });
            }
            const rows = await query
                .update({
                status: 'acknowledged',
                acknowledged_by: userId,
                acknowledged_at: new Date(),
            })
                .returning(ESCALATION_COLS);
            if (rows.length === 0) {
                const current = await Escalations.getById(escalationId, projectId, trx);
                return { escalation: null, alreadyAcknowledged: current?.status !== 'open', current };
            }
            const escalation = rows[0];
            let response = null;
            if (note && note.trim()) {
                response = await Escalations.addResponse({
                    escalation_id: escalationId,
                    author_id: userId,
                    body: note.trim(),
                    is_acknowledgement: true,
                }, trx);
            }
            return { escalation, alreadyAcknowledged: false, response };
        });
    }
    static async resolve({ escalationId, projectId, userId, note, }) {
        return await db.transaction(async (trx) => {
            const current = await trx('escalation').where('escalation_id', escalationId).first();
            if (!current)
                return { escalation: null };
            if (projectId && current.project_id !== projectId)
                return { escalation: null };
            const now = new Date();
            const updates = {
                status: 'resolved',
                resolved_by: userId,
                resolved_at: now,
            };
            if (current.status === 'open') {
                updates.acknowledged_by = current.acknowledged_by ?? userId;
                updates.acknowledged_at = current.acknowledged_at ?? now;
            }
            const rows = await trx('escalation')
                .where('escalation_id', escalationId)
                .update(updates)
                .returning(ESCALATION_COLS);
            const escalation = rows[0] ?? null;
            let response = null;
            if (note && note.trim() && escalation) {
                response = await Escalations.addResponse({
                    escalation_id: escalationId,
                    author_id: userId,
                    body: note.trim(),
                    is_acknowledgement: false,
                }, trx);
            }
            return { escalation, response };
        });
    }
    static async update(escalationId, patch, projectId, trx) {
        const q = trx ? trx('escalation') : db('escalation');
        let query = q.where('escalation_id', escalationId);
        if (projectId) {
            query = query.andWhere('project_id', projectId);
        }
        const [row] = await query.update(patch).returning(ESCALATION_COLS);
        return row ?? null;
    }
    static async delete(escalationId, projectId, trx) {
        const q = trx ? trx('escalation') : db('escalation');
        const respQ = trx ? trx('escalation_response') : db('escalation_response');
        await respQ.where('escalation_id', escalationId).del();
        let query = q.where('escalation_id', escalationId);
        if (projectId) {
            query = query.andWhere('project_id', projectId);
        }
        const [row] = await query.del().returning(ESCALATION_COLS);
        return row ?? null;
    }
    static async addResponse(input, trx) {
        const q = trx ? trx('escalation_response') : db('escalation_response');
        const [row] = await q
            .insert({
            response_id: input.response_id ?? randomUUID(),
            escalation_id: input.escalation_id,
            author_id: input.author_id,
            body: input.body,
            is_acknowledgement: input.is_acknowledgement ?? false,
        })
            .returning(['response_id', 'escalation_id', 'author_id', 'body', 'is_acknowledgement', 'created_at']);
        return row;
    }
    static async getResponses(escalationId, trx) {
        const q = trx ? trx('escalation_response') : db('escalation_response');
        const rows = await q
            .leftJoin('users', 'escalation_response.author_id', 'users.id')
            .where('escalation_response.escalation_id', escalationId)
            .select('escalation_response.*', db.raw("NULLIF(CONCAT(users.first_name, ' ', users.last_name), ' ') as author_name"))
            .orderBy('escalation_response.created_at', 'asc');
        return rows;
    }
}
const WEEKLY_SUBMISSION_COLS = [
    'weekly_submission.submission_id',
    'weekly_submission.project_id',
    'weekly_submission.week_start',
    'weekly_submission.revision_no',
    'weekly_submission.supersedes_submission_id',
    'weekly_submission.supersede_reason',
    'weekly_submission.supersede_authorised_by',
    'weekly_submission.supersede_authorised_at',
    'weekly_submission.status',
    'weekly_submission.schedule_version_id',
    'weekly_submission.planned_pct',
    'weekly_submission.actual_pct',
    'weekly_submission.spi',
    'weekly_submission.rag',
    'weekly_submission.active_stages',
    'weekly_submission.scope_change_text',
    'weekly_submission.top_risk_id',
    'weekly_submission.top_risk_text',
    'weekly_submission.top_action',
    'weekly_submission.pm_commentary',
    'weekly_submission.exco_decision_needed',
    'weekly_submission.escalate',
    'weekly_submission.escalation_reason',
    'weekly_submission.is_late',
    'weekly_submission.created_by',
    'weekly_submission.created_at',
    'weekly_submission.updated_at',
    'weekly_submission.approved_by',
    'weekly_submission.approved_at',
];
function computeWeeklyIsLate(approvedAt, weekStart, timezone = 'Africa/Nairobi') {
    try {
        const weekStartStr = typeof weekStart === 'string'
            ? weekStart.slice(0, 10)
            : weekStart.toISOString().slice(0, 10);
        const parts = weekStartStr.split('-');
        const year = Number(parts[0]);
        const month = Number(parts[1]);
        const day = Number(parts[2]);
        if (isNaN(year) || isNaN(month) || isNaN(day))
            return false;
        const nextMonday = new Date(Date.UTC(year, month - 1, day + 7));
        const deadlineDateStr = nextMonday.toISOString().slice(0, 10);
        const localDateStr = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(approvedAt);
        const localTimeStr = new Intl.DateTimeFormat('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        }).format(approvedAt);
        if (localDateStr > deadlineDateStr) {
            return true;
        }
        if (localDateStr === deadlineDateStr && localTimeStr > '09:00:00') {
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
export class WeeklySubmissions {
    static async create(input, trx) {
        const execute = async (t) => {
            const submissionId = input.submission_id ?? randomUUID();
            // AC-WKS-02: If active_stages not provided, default to currently active stages for this project
            let activeStages = input.active_stages;
            if (!activeStages) {
                const currentActive = await t('project_stage')
                    .where({ project_id: input.project_id, state: 'active', in_scope: true })
                    .select('stage_no');
                activeStages = currentActive.map((s) => Number(s.stage_no));
            }
            await t('weekly_submission').insert({
                submission_id: submissionId,
                project_id: input.project_id,
                week_start: input.week_start,
                revision_no: input.revision_no ?? 1,
                status: 'draft',
                active_stages: activeStages,
                scope_change_text: input.scope_change_text ?? 'No scope change',
                top_risk_id: input.top_risk_id ?? null,
                top_risk_text: input.top_risk_text ?? null,
                top_action: input.top_action ?? null,
                pm_commentary: input.pm_commentary ?? null,
                exco_decision_needed: input.exco_decision_needed ?? null,
                escalate: input.escalate ?? false,
                escalation_reason: input.escalate ? (input.escalation_reason ?? null) : null,
                created_by: input.created_by,
            });
            if (input.addressed_risks && input.addressed_risks.length > 0) {
                const rows = input.addressed_risks.map((r) => ({
                    submission_id: submissionId,
                    risk_id: r.risk_id,
                    project_id: input.project_id,
                    method: r.method,
                    added_by: input.created_by,
                }));
                await t('submission_addressed_risk').insert(rows);
            }
            const created = await WeeklySubmissions.getById(submissionId, input.project_id, t);
            return created;
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
    static async list({ projectId, status, week_start, page = 1, limit = 25, }, trx) {
        const q = trx ? trx('weekly_submission') : db('weekly_submission');
        const base = q;
        if (projectId) {
            base.where('weekly_submission.project_id', projectId);
        }
        if (status) {
            base.where('weekly_submission.status', status);
        }
        if (week_start) {
            base.where('weekly_submission.week_start', week_start);
        }
        const countRes = await base
            .clone()
            .count('weekly_submission.submission_id as count');
        const total = Number(countRes[0]?.count ?? 0);
        const rows = await base
            .clone()
            .leftJoin('projects', 'weekly_submission.project_id', 'projects.project_id')
            .leftJoin('users as creator', 'weekly_submission.created_by', 'creator.id')
            .leftJoin('users as approver', 'weekly_submission.approved_by', 'approver.id')
            .leftJoin('users as authoriser', 'weekly_submission.supersede_authorised_by', 'authoriser.id')
            .select(...WEEKLY_SUBMISSION_COLS, 'projects.name as project_name', 'projects.project_code', db.raw("NULLIF(CONCAT(creator.first_name, ' ', creator.last_name), ' ') as creator_name"), db.raw("NULLIF(CONCAT(approver.first_name, ' ', approver.last_name), ' ') as approver_name"), db.raw("NULLIF(CONCAT(authoriser.first_name, ' ', authoriser.last_name), ' ') as supersede_authoriser_name"))
            .orderBy('weekly_submission.week_start', 'desc')
            .orderBy('weekly_submission.revision_no', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);
        return {
            submissions: rows,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        };
    }
    static async getById(submissionId, projectId, trx) {
        const q = trx ? trx('weekly_submission') : db('weekly_submission');
        let query = q
            .leftJoin('projects', 'weekly_submission.project_id', 'projects.project_id')
            .leftJoin('users as creator', 'weekly_submission.created_by', 'creator.id')
            .leftJoin('users as approver', 'weekly_submission.approved_by', 'approver.id')
            .leftJoin('users as authoriser', 'weekly_submission.supersede_authorised_by', 'authoriser.id')
            .where('weekly_submission.submission_id', submissionId);
        if (projectId) {
            query = query.andWhere('weekly_submission.project_id', projectId);
        }
        const row = await query
            .select(...WEEKLY_SUBMISSION_COLS, 'projects.name as project_name', 'projects.project_code', db.raw("NULLIF(CONCAT(creator.first_name, ' ', creator.last_name), ' ') as creator_name"), db.raw("NULLIF(CONCAT(approver.first_name, ' ', approver.last_name), ' ') as approver_name"), db.raw("NULLIF(CONCAT(authoriser.first_name, ' ', authoriser.last_name), ' ') as supersede_authoriser_name"))
            .first();
        if (!row)
            return null;
        const sarQuery = trx ? trx('submission_addressed_risk') : db('submission_addressed_risk');
        const addressedRisks = await sarQuery
            .leftJoin('risk', 'submission_addressed_risk.risk_id', 'risk.risk_id')
            .where('submission_addressed_risk.submission_id', submissionId)
            .select('submission_addressed_risk.*', 'risk.title as risk_title', 'risk.status as risk_status');
        const escQuery = trx ? trx('escalation') : db('escalation');
        const escalation = await escQuery.where('submission_id', submissionId).first();
        return {
            ...row,
            project_name: row.project_name,
            project_code: row.project_code,
            creator_name: row.creator_name,
            approver_name: row.approver_name,
            supersede_authoriser_name: row.supersede_authoriser_name,
            addressed_risks: addressedRisks,
            escalation: escalation ?? null,
        };
    }
    static async update(submissionId, input, userId, projectId, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where('submission_id', submissionId);
            if (projectId) {
                q = q.andWhere('project_id', projectId);
            }
            const existing = await q.first();
            if (!existing)
                return { notFound: true };
            // AC-WKS-06: Approved/superseded submissions cannot be modified
            if (existing.status !== 'draft') {
                return { readOnly: true };
            }
            // AC-GEN-12: Optimistic concurrency check
            if (input.updated_at) {
                const existingTime = new Date(existing.updated_at).getTime();
                const incomingTime = new Date(input.updated_at).getTime();
                if (Math.abs(existingTime - incomingTime) > 1000) {
                    return { concurrencyError: true };
                }
            }
            const updates = {
                updated_at: new Date(),
            };
            if (input.active_stages !== undefined)
                updates.active_stages = input.active_stages;
            if (input.scope_change_text !== undefined)
                updates.scope_change_text = input.scope_change_text;
            if (input.top_risk_id !== undefined)
                updates.top_risk_id = input.top_risk_id;
            if (input.top_risk_text !== undefined)
                updates.top_risk_text = input.top_risk_text;
            if (input.top_action !== undefined)
                updates.top_action = input.top_action;
            if (input.pm_commentary !== undefined)
                updates.pm_commentary = input.pm_commentary;
            if (input.exco_decision_needed !== undefined)
                updates.exco_decision_needed = input.exco_decision_needed;
            if (input.escalate !== undefined)
                updates.escalate = input.escalate;
            if (input.escalation_reason !== undefined)
                updates.escalation_reason = input.escalation_reason;
            await t('weekly_submission').where('submission_id', submissionId).update(updates);
            if (input.addressed_risks !== undefined) {
                await t('submission_addressed_risk').where('submission_id', submissionId).del();
                if (input.addressed_risks.length > 0) {
                    const rows = input.addressed_risks.map((r) => ({
                        submission_id: submissionId,
                        risk_id: r.risk_id,
                        project_id: existing.project_id,
                        method: r.method,
                        added_by: userId,
                    }));
                    await t('submission_addressed_risk').insert(rows);
                }
            }
            const full = await WeeklySubmissions.getById(submissionId, existing.project_id, t);
            return { submission: full };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
    static async delete(submissionId, projectId, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where('submission_id', submissionId);
            if (projectId) {
                q = q.andWhere('project_id', projectId);
            }
            const existing = await q.first();
            if (!existing)
                return { notFound: true };
            if (existing.status !== 'draft') {
                return { readOnly: true };
            }
            await t('submission_addressed_risk').where('submission_id', submissionId).del();
            await t('weekly_submission').where('submission_id', submissionId).del();
            return { success: true };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
    static async approve(submissionId, input, projectId, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where('submission_id', submissionId);
            if (projectId) {
                q = q.andWhere('project_id', projectId);
            }
            const existing = await q.first();
            if (!existing)
                return { notFound: true };
            if (existing.status === 'approved')
                return { alreadyApproved: true };
            if (input.updated_at) {
                const existingTime = new Date(existing.updated_at).getTime();
                const incomingTime = new Date(input.updated_at).getTime();
                if (Math.abs(existingTime - incomingTime) > 1000) {
                    return { concurrencyError: true };
                }
            }
            // AC-WKS-04: Approval validations
            const errors = [];
            if (!existing.top_risk_text?.trim())
                errors.push('Top risk text is required for approval');
            if (!existing.top_action?.trim())
                errors.push('Top action is required for approval');
            if (!existing.pm_commentary?.trim())
                errors.push('PM commentary is required for approval');
            if (existing.escalate && !existing.escalation_reason?.trim()) {
                errors.push('Escalation reason is required when escalate is enabled');
            }
            // Check active stages are in scope
            const inScopeStages = await t('project_stage')
                .where({ project_id: existing.project_id, in_scope: true })
                .select('stage_no');
            const inScopeSet = new Set(inScopeStages.map((s) => Number(s.stage_no)));
            const activeStages = existing.active_stages || [];
            for (const stg of activeStages) {
                if (!inScopeSet.has(Number(stg))) {
                    errors.push(`Stage ${stg} is not in project scope`);
                }
            }
            // BR-18: Check unaddressed overdue risk issues
            const unaddressedRisks = await t('risk')
                .where({
                project_id: existing.project_id,
                source: 'overdue_task',
                status: 'open',
            })
                .whereNull('addressed_at')
                .whereNotIn('risk_id', t('submission_addressed_risk')
                .where('submission_id', submissionId)
                .select('risk_id'))
                .select('risk_id', 'title');
            if (unaddressedRisks.length > 0) {
                const titles = unaddressedRisks.map((r) => r.title).join(', ');
                errors.push(`Unaddressed overdue task risks must be addressed before approval: ${titles}`);
            }
            if (errors.length > 0) {
                return { validationErrors: errors };
            }
            const project = await t('projects').where('project_id', existing.project_id).first();
            // AC-WKS-05 (1): Schedule values are recomputed here, not taken from the request. The
            // client's figures come from whatever metrics snapshot its page happened to load, which
            // can be weeks stale; the submission must record the project's position at approval.
            let scheduleVersionId = input.schedule_version_id ?? existing.schedule_version_id ?? null;
            if (!scheduleVersionId) {
                const latestSchedule = await t('schedule_version')
                    .where({ project_id: existing.project_id, status: 'applied' })
                    .orderBy('version_no', 'desc')
                    .first();
                if (latestSchedule) {
                    scheduleVersionId = latestSchedule.schedule_version_id;
                }
            }
            // No applied schedule, or none of its tasks carry duration, means there is no position to
            // report. AC-WKS-05 allows all four to be null then — the report suppresses its KPI cards
            // rather than showing a fabricated 0%.
            const snapshot = scheduleVersionId
                ? await refreshProjectMetrics(t, existing.project_id, scheduleVersionId, project?.timezone ?? 'Africa/Nairobi')
                : null;
            const plannedPct = snapshot?.planned_pct ?? null;
            const actualPct = snapshot?.actual_pct ?? null;
            const spi = snapshot?.spi ?? null;
            const rag = snapshot?.rag ?? null;
            // AC-WKS-05 (2): Set approved, is_late
            const approvedAt = new Date();
            const isLate = computeWeeklyIsLate(approvedAt, existing.week_start, project?.timezone ?? 'Africa/Nairobi');
            await t('weekly_submission').where('submission_id', submissionId).update({
                status: 'approved',
                approved_by: input.approved_by,
                approved_at: approvedAt,
                is_late: isLate,
                schedule_version_id: scheduleVersionId,
                planned_pct: plannedPct,
                actual_pct: actualPct,
                spi: spi,
                rag: rag,
                updated_at: new Date(),
            });
            // AC-WKS-05 (3): Apply active stages transitions
            const currentActiveRows = await t('project_stage')
                .where({ project_id: existing.project_id, state: 'active' })
                .select('stage_no', 'state');
            const currentActiveSet = new Set(currentActiveRows.map((r) => Number(r.stage_no)));
            const newActiveSet = new Set(activeStages.map(Number));
            // Chips not currently active -> activated
            for (const stg of newActiveSet) {
                if (!currentActiveSet.has(stg)) {
                    const currentStage = await t('project_stage')
                        .where({ project_id: existing.project_id, stage_no: stg })
                        .first();
                    await t('project_stage')
                        .where({ project_id: existing.project_id, stage_no: stg })
                        .update({
                        state: 'active',
                        last_changed_by: input.approved_by,
                        last_changed_at: approvedAt,
                    });
                    await t('stage_state_history').insert({
                        event_id: randomUUID(),
                        project_id: existing.project_id,
                        stage_no: stg,
                        event: 'activated',
                        from_state: currentStage?.state ?? null,
                        to_state: 'active',
                        actor_id: input.approved_by,
                        occurred_at: approvedAt,
                        submission_id: submissionId,
                    });
                }
            }
            // Currently active not in chips -> deactivated
            for (const stg of currentActiveSet) {
                if (!newActiveSet.has(stg)) {
                    await t('project_stage')
                        .where({ project_id: existing.project_id, stage_no: stg })
                        .update({
                        state: 'inactive',
                        last_changed_by: input.approved_by,
                        last_changed_at: approvedAt,
                    });
                    await t('stage_state_history').insert({
                        event_id: randomUUID(),
                        project_id: existing.project_id,
                        stage_no: stg,
                        event: 'deactivated',
                        from_state: 'active',
                        to_state: 'inactive',
                        actor_id: input.approved_by,
                        occurred_at: approvedAt,
                        submission_id: submissionId,
                    });
                }
            }
            // AC-WKS-05 (4): Update addressed risks
            const addressed = await t('submission_addressed_risk').where('submission_id', submissionId);
            for (const sar of addressed) {
                if (sar.method === 'dismissed') {
                    await t('risk').where('risk_id', sar.risk_id).update({
                        status: 'closed',
                        closed_at: approvedAt,
                    });
                }
                else {
                    await t('risk').where('risk_id', sar.risk_id).update({
                        addressed_at: approvedAt,
                        addressed_submission_id: submissionId,
                    });
                }
            }
            // AC-WKS-05 (5): If escalate, create escalation
            if (existing.escalate) {
                const existingEsc = await t('escalation').where('submission_id', submissionId).first();
                if (!existingEsc) {
                    await t('escalation').insert({
                        escalation_id: randomUUID(),
                        submission_id: submissionId,
                        project_id: existing.project_id,
                        status: 'open',
                        created_at: approvedAt,
                    });
                }
            }
            // AC-WKS-05 (6): If supersedes another, set old one to superseded
            if (existing.supersedes_submission_id) {
                await t('weekly_submission')
                    .where('submission_id', existing.supersedes_submission_id)
                    .update({
                    status: 'superseded',
                    updated_at: approvedAt,
                });
            }
            const full = await WeeklySubmissions.getById(submissionId, existing.project_id, t);
            return { submission: full };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
    static async supersede(submissionId, input, projectId, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where('submission_id', submissionId);
            if (projectId) {
                q = q.andWhere('project_id', projectId);
            }
            const existing = await q.first();
            if (!existing)
                return { notFound: true };
            if (existing.status !== 'approved')
                return { notApproved: true };
            // AC-WKS-07: DB allows at most one draft per project-week
            const existingDraft = await t('weekly_submission')
                .where({
                project_id: existing.project_id,
                week_start: existing.week_start,
                status: 'draft',
            })
                .first();
            if (existingDraft)
                return { draftAlreadyExists: true };
            const newSubmissionId = randomUUID();
            const authorisedAt = new Date();
            await t('weekly_submission').insert({
                submission_id: newSubmissionId,
                project_id: existing.project_id,
                week_start: existing.week_start,
                revision_no: Number(existing.revision_no) + 1,
                supersedes_submission_id: existing.submission_id,
                supersede_reason: input.supersede_reason,
                supersede_authorised_by: input.authorised_by,
                supersede_authorised_at: authorisedAt,
                status: 'draft',
                active_stages: existing.active_stages,
                scope_change_text: existing.scope_change_text,
                top_risk_id: existing.top_risk_id,
                top_risk_text: existing.top_risk_text,
                top_action: existing.top_action,
                pm_commentary: existing.pm_commentary,
                exco_decision_needed: existing.exco_decision_needed,
                escalate: existing.escalate,
                escalation_reason: existing.escalation_reason,
                created_by: input.authorised_by,
            });
            // Copy addressed risks to the new draft
            const oldRisks = await t('submission_addressed_risk').where('submission_id', submissionId);
            if (oldRisks.length > 0) {
                const newRows = oldRisks.map((r) => ({
                    submission_id: newSubmissionId,
                    risk_id: r.risk_id,
                    project_id: existing.project_id,
                    method: r.method,
                    added_by: input.authorised_by,
                }));
                await t('submission_addressed_risk').insert(newRows);
            }
            const full = await WeeklySubmissions.getById(newSubmissionId, existing.project_id, t);
            return { newDraft: full };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
    static async addAddressedRisk(submissionId, input, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where('submission_id', submissionId);
            if (input.projectId) {
                q = q.andWhere('project_id', input.projectId);
            }
            const submission = await q.first();
            if (!submission)
                return { notFound: true };
            if (submission.status !== 'draft')
                return { readOnly: true };
            // Validate risk belongs to same project and is open (AC-WKS-03)
            const risk = await t('risk')
                .where({ risk_id: input.risk_id, project_id: submission.project_id, status: 'open' })
                .first();
            if (!risk)
                return { riskNotFound: true };
            const [row] = await t('submission_addressed_risk')
                .insert({
                submission_id: submissionId,
                risk_id: input.risk_id,
                project_id: submission.project_id,
                method: input.method,
                added_by: input.userId,
            })
                .onConflict(['submission_id', 'risk_id'])
                .merge({
                method: input.method,
                added_by: input.userId,
                added_at: new Date(),
            })
                .returning('*');
            return {
                addressedRisk: {
                    ...row,
                    risk_title: risk.title,
                    risk_status: risk.status,
                },
            };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
    static async removeAddressedRisk(submissionId, riskId, projectId, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where('submission_id', submissionId);
            if (projectId) {
                q = q.andWhere('project_id', projectId);
            }
            const submission = await q.first();
            if (!submission)
                return { notFound: true };
            if (submission.status !== 'draft')
                return { readOnly: true };
            await t('submission_addressed_risk')
                .where({ submission_id: submissionId, risk_id: riskId })
                .del();
            return { success: true };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
}
/** The DPR photos a PM has picked to go out with this submission's client report (AC-CRP area).
 *  Candidates are every photo on a submitted DPR within the submission's week; `selected` reads
 *  from `submission_client_photo`, the join table the "Send to client" flow reads at send time. */
export class SubmissionClientPhotos {
    static async listForSubmission(submissionId, projectId) {
        let subQ = db('weekly_submission').where({ submission_id: submissionId });
        if (projectId)
            subQ = subQ.andWhere({ project_id: projectId });
        const submission = await subQ.first();
        if (!submission)
            return null;
        const weekStart = new Date(submission.week_start);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const rows = await db('dpr_photo as p')
            .join('dpr as d', 'd.dpr_id', 'p.dpr_id')
            .join('file_object as fo', 'fo.file_id', 'p.file_id')
            .leftJoin('submission_client_photo as scp', function () {
            this.on('scp.photo_id', '=', 'p.photo_id').andOn('scp.submission_id', '=', db.raw('?', [submissionId]));
        })
            .where('d.project_id', submission.project_id)
            .andWhere('d.status', 'submitted')
            .andWhereBetween('d.report_date', [
            weekStart.toISOString().slice(0, 10),
            weekEnd.toISOString().slice(0, 10),
        ])
            .select('p.photo_id', 'p.dpr_id', 'p.file_id', 'p.caption', 'p.taken_at', 'd.report_date', 'd.site_location', 'fo.storage_key', 'fo.mime_type', db.raw('(scp.photo_id IS NOT NULL) as selected'))
            .orderBy('d.report_date', 'asc')
            .orderBy('p.sort_order', 'asc');
        return rows.map((row) => ({
            ...row,
            url: objectUrl({ storage_key: row.storage_key, mime_type: row.mime_type }),
        }));
    }
    static async setSelected(submissionId, photoIds, projectId, trx) {
        const execute = async (t) => {
            let q = t('weekly_submission').where({ submission_id: submissionId });
            if (projectId)
                q = q.andWhere({ project_id: projectId });
            const submission = await q.first();
            if (!submission)
                return { notFound: true };
            if (submission.status !== 'draft')
                return { readOnly: true };
            await t('submission_client_photo').where({ submission_id: submissionId }).del();
            if (photoIds.length > 0) {
                const rows = photoIds.map((photo_id, idx) => ({
                    submission_id: submissionId,
                    photo_id,
                    sort_order: idx,
                }));
                await t('submission_client_photo').insert(rows);
            }
            return { success: true };
        };
        return trx ? execute(trx) : db.transaction(execute);
    }
}
const CHANGE_REQUEST_COLS = [
    'change_id', 'project_id', 'change_no', 'stage_no', 'type', 'title',
    'scope_description', 'reason', 'supporting_notes', 'cost_impact', 'cost_currency',
    'schedule_impact_days', 'status', 'raised_by', 'raised_at', 'decided_at', 'withdrawn_at',
];
// Required approver roles per AC-CHG-03. Finance is listed for future rollout (R2)
// but has no role grants yet, so only 'exco' is enforced today.
const REQUIRED_APPROVER_ROLES = ['exco'];
export class ChangeRequests {
    /** Attachments on a change request, with Cloudinary delivery URLs (never the raw storage_key —
     *  see objectStorage.ts's assertStorageKeyIsHandle comment). */
    static async attachmentsFor(changeId, trx) {
        const t = trx ?? db;
        const rows = await t('change_request_attachment as a')
            .join('file_object as fo', 'fo.file_id', 'a.file_id')
            .where({ 'a.change_id': changeId })
            .select('a.attachment_id', 'a.file_id', 'a.uploaded_by', 'a.uploaded_at', 'fo.original_filename', 'fo.storage_key', 'fo.mime_type')
            .orderBy('a.uploaded_at', 'asc');
        return rows.map((r) => ({
            attachment_id: r.attachment_id,
            file_id: r.file_id,
            original_filename: r.original_filename,
            uploaded_by: r.uploaded_by,
            uploaded_at: r.uploaded_at,
            url: objectUrl({ storage_key: r.storage_key, mime_type: r.mime_type }),
        }));
    }
    static async create(input) {
        return db.transaction(async (trx) => {
            // AC-CHG-01: change_no = max for project + 1. Row-locks existing rows of the
            // project to serialize concurrent raises; a project's first ever change request
            // has nothing to lock, which is an accepted race for how rarely that collides.
            // Postgres rejects FOR UPDATE on an aggregate query, so lock the latest row directly.
            const latest = await trx('change_request')
                .where({ project_id: input.project_id })
                .orderBy('change_no', 'desc')
                .select('change_no')
                .first()
                .forUpdate();
            const change_no = Number(latest?.change_no ?? 0) + 1;
            const [row] = await trx('change_request')
                .insert({
                change_id: randomUUID(),
                project_id: input.project_id,
                change_no,
                stage_no: input.stage_no,
                type: input.type,
                title: input.title,
                scope_description: input.scope_description,
                reason: input.reason,
                supporting_notes: input.supporting_notes,
                cost_impact: input.cost_impact,
                cost_currency: input.cost_currency,
                schedule_impact_days: input.schedule_impact_days,
                // shortcut: ExCo review is switched off for now, so every raise is approved on the
                // spot (no change_approval row — nobody decided it). Restore 'pending' here, and the
                // Site Engineer FYI branch in changeRequestRouter, when the review runs again.
                status: 'approved',
                decided_at: new Date(),
                raised_by: input.raised_by,
            })
                .returning(CHANGE_REQUEST_COLS);
            if (input.attachmentFileIds && input.attachmentFileIds.length > 0) {
                await trx('change_request_attachment').insert(input.attachmentFileIds.map((fileId) => ({
                    attachment_id: randomUUID(),
                    change_id: row.change_id,
                    file_id: fileId,
                    uploaded_by: input.raised_by,
                })));
            }
            const attachments = await ChangeRequests.attachmentsFor(row.change_id, trx);
            return { ...row, attachments };
        });
    }
    static async list({ projectId, stageNo, type, status, search, page = 1, limit = 25, }) {
        const base = db('change_request').where({ project_id: projectId });
        if (stageNo !== undefined)
            base.andWhere({ stage_no: stageNo });
        if (type)
            base.andWhere({ type });
        if (status)
            base.andWhere({ status });
        if (search)
            base.andWhereILike('title', `%${search}%`);
        const countRows = await base.clone().count('change_id as count');
        const total = Number(countRows[0]?.count ?? 0);
        const changeRequests = await base
            .clone()
            .select(CHANGE_REQUEST_COLS)
            .orderBy('raised_at', 'desc')
            .limit(limit)
            .offset((page - 1) * limit);
        return { changeRequests, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }
    static async getById(projectId, changeId) {
        const row = await db('change_request').where({ project_id: projectId, change_id: changeId }).first();
        if (!row)
            return null;
        const attachments = await ChangeRequests.attachmentsFor(changeId);
        return { ...row, attachments };
    }
    static async update(projectId, changeId, patch, 
    /** file_object ids from a prior /attachments/upload call — appended, existing ones kept. */
    newAttachmentFileIds, uploadedBy) {
        return db.transaction(async (trx) => {
            let row;
            if (Object.keys(patch).length > 0) {
                [row] = await trx('change_request')
                    .where({ project_id: projectId, change_id: changeId })
                    .update(patch)
                    .returning(CHANGE_REQUEST_COLS);
            }
            else {
                row = await trx('change_request')
                    .where({ project_id: projectId, change_id: changeId })
                    .first(CHANGE_REQUEST_COLS);
            }
            if (!row)
                return null;
            if (newAttachmentFileIds && newAttachmentFileIds.length > 0 && uploadedBy) {
                await trx('change_request_attachment').insert(newAttachmentFileIds.map((fileId) => ({
                    attachment_id: randomUUID(),
                    change_id: changeId,
                    file_id: fileId,
                    uploaded_by: uploadedBy,
                })));
            }
            const attachments = await ChangeRequests.attachmentsFor(changeId, trx);
            return { ...row, attachments };
        });
    }
    // AC-CHG-02: decide (ExCo only). Gated on status = 'pending' so a concurrent second
    // decision loses the row-count race instead of double-deciding (first decision wins).
    static async decide({ changeId, projectId, approverId, decision, comment, }) {
        return db.transaction(async (trx) => {
            let query = trx('change_request').where({ change_id: changeId, status: 'pending' });
            if (projectId)
                query = query.andWhere({ project_id: projectId });
            const rows = await query.forUpdate().select(CHANGE_REQUEST_COLS);
            if (rows.length === 0) {
                let current = trx('change_request').where({ change_id: changeId });
                if (projectId)
                    current = current.andWhere({ project_id: projectId });
                return { changeRequest: null, alreadyDecided: true, current: (await current.first()) ?? null };
            }
            await trx('change_approval').insert({
                approval_id: randomUUID(),
                change_id: changeId,
                approver_role: 'exco',
                approver_id: approverId,
                decision,
                comment: comment ?? null,
            });
            // AC-CHG-03: status becomes approved only once every required role has
            // approved, rejected as soon as any required role rejects. REQUIRED_APPROVER_ROLES
            // is ['exco'] today, so a single approval already satisfies it.
            let status = 'pending';
            if (decision === 'reject') {
                status = 'rejected';
            }
            else {
                const approvals = await trx('change_approval')
                    .where({ change_id: changeId, decision: 'approve' })
                    .pluck('approver_role');
                const satisfied = REQUIRED_APPROVER_ROLES.every((role) => approvals.includes(role));
                status = satisfied ? 'approved' : 'pending';
            }
            const [changeRequest] = status === 'pending'
                ? [rows[0]]
                : await trx('change_request')
                    .where({ change_id: changeId })
                    .update({ status, decided_at: new Date() })
                    .returning(CHANGE_REQUEST_COLS);
            return { changeRequest, alreadyDecided: false };
        });
    }
    // AC-CHG-04: withdraw — only the raiser, only while pending.
    static async withdraw(projectId, changeId, raisedBy) {
        const [row] = await db('change_request')
            .where({ project_id: projectId, change_id: changeId, status: 'pending', raised_by: raisedBy })
            .update({ status: 'withdrawn', withdrawn_at: new Date() })
            .returning(CHANGE_REQUEST_COLS);
        return row ?? null;
    }
}
export class Notifications {
    static async listForUser(userId, { unreadOnly = false } = {}) {
        const query = db('notification').where({ recipient_id: userId, in_app: true });
        if (unreadOnly)
            query.whereNull('read_at');
        return query.orderBy('created_at', 'desc').limit(100);
    }
    static async unreadCount(userId) {
        const row = await db('notification')
            .where({ recipient_id: userId, in_app: true })
            .whereNull('read_at')
            .count('notification_id as count')
            .first();
        return Number(row?.count ?? 0);
    }
    static async markRead(notificationId, userId) {
        const count = await db('notification')
            .where({ notification_id: notificationId, recipient_id: userId })
            .update({ read_at: db.fn.now() });
        return count > 0;
    }
    static async markAllRead(userId) {
        await db('notification').where({ recipient_id: userId }).whereNull('read_at').update({ read_at: db.fn.now() });
    }
}
export class NotificationPreferences {
    static async listTypes() {
        return db('notification_type').select('*').orderBy('type_code');
    }
    static async getForUser(userId) {
        return db('notification_preference').where({ user_id: userId });
    }
    static async setForUser(userId, typeCode, channel, enabled) {
        await db('notification_preference')
            .insert({ user_id: userId, type_code: typeCode, channel, enabled })
            .onConflict(['user_id', 'type_code', 'channel'])
            .merge(['enabled', 'updated_at']);
    }
}
const FILE_OBJECT_COLS = [
    'file_id', 'project_id', 'purpose', 'parent_file_id', 'variant', 'storage_key',
    'original_filename', 'mime_type', 'size_bytes', 'sha256', 'width_px', 'height_px',
    'status', 'rejection_reason', 'uploaded_by', 'created_at',
];
/** size_bytes is bigint, which pg returns as a string. Every size here fits in a JS number
 *  (the largest purpose cap is 50 MB), so normalise it once on the way out. */
function toFileObjectRow(row) {
    return { ...row, size_bytes: Number(row.size_bytes) };
}
/** Storage-agnostic metadata for every uploaded object: schedule files, DPR photos,
 *  activity attachments and generated client reports. The bytes live wherever
 *  utils/objectStorage.ts put them; storage_key is the handle. */
export class FileObjects {
    static async create(input) {
        const [row] = await db('file_object')
            .insert({
            file_id: randomUUID(),
            project_id: input.project_id,
            purpose: input.purpose,
            parent_file_id: input.parent_file_id ?? null,
            variant: input.variant ?? 'original',
            storage_key: input.storage_key,
            original_filename: input.original_filename,
            mime_type: input.mime_type,
            size_bytes: input.size_bytes,
            sha256: input.sha256,
            width_px: input.width_px ?? null,
            height_px: input.height_px ?? null,
            status: input.status,
            rejection_reason: input.rejection_reason ?? null,
            uploaded_by: input.uploaded_by,
        })
            .returning(FILE_OBJECT_COLS);
        return toFileObjectRow(row);
    }
    /** AC-GEN-08: soft-deleted files are invisible to every read path. */
    static async getById(fileId) {
        const row = await db('file_object')
            .where({ file_id: fileId })
            .whereNull('deleted_at')
            .select(FILE_OBJECT_COLS)
            .first();
        return row ? toFileObjectRow(row) : undefined;
    }
    static async markRejected(fileId, reason) {
        await db('file_object')
            .where({ file_id: fileId })
            .update({ status: 'rejected', rejection_reason: reason });
    }
    /** Hard delete, for undoing an upload whose owning row was never written. Rows that have
     *  been referenced are retired with deleted_at instead (AC-GEN-08), never with this. */
    static async remove(fileId) {
        await db('file_object').where({ file_id: fileId }).del();
    }
}
/**
 * The navbar's global search. One query per entity rather than a UNION: each has a different
 * notion of a title and of what to show beneath it, and four small indexed LIKEs are cheaper
 * to read than one wide union that has to normalise them.
 *
 * `projectIds` is the visibility filter — null means unrestricted (a global grant), an array
 * means those projects only. An empty array can see nothing, which is not the same as null,
 * so it must short-circuit rather than fall through to "no filter".
 */
export class Search {
    static async query({ q, projectIds, limit = 5, }) {
        const empty = { projects: [], risks: [], changeRequests: [], milestones: [] };
        const term = q.trim();
        if (!term || (projectIds && projectIds.length === 0))
            return empty;
        // Escape the LIKE wildcards so a literal % or _ in the query searches for itself.
        const pattern = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
        const scope = (query, column) => {
            if (projectIds)
                query.whereIn(column, projectIds);
            return query;
        };
        const [projects, risks, changeRequests, milestones] = await Promise.all([
            scope(db('projects'), 'project_id')
                .where((qb) => {
                qb.whereILike('name', pattern).orWhereILike('project_code', pattern);
            })
                .orderBy('name')
                .limit(limit)
                .select('project_id as id', 'project_id', 'name as title', 'project_code as subtitle'),
            scope(db('risk as r'), 'r.project_id')
                .join('projects as p', 'p.project_id', 'r.project_id')
                .whereILike('r.title', pattern)
                .where('r.status', 'open')
                .orderBy('r.score', 'desc')
                .limit(limit)
                .select('r.risk_id as id', 'r.project_id', 'p.name as project_name', 'r.title', 'r.kind as subtitle'),
            scope(db('change_request as c'), 'c.project_id')
                .join('projects as p', 'p.project_id', 'c.project_id')
                .whereILike('c.title', pattern)
                .orderBy('c.raised_at', 'desc')
                .limit(limit)
                .select('c.change_id as id', 'c.project_id', 'p.name as project_name', 'c.title', 'c.type as subtitle'),
            scope(db('project_milestone_v as m'), 'm.project_id')
                .join('projects as p', 'p.project_id', 'm.project_id')
                .whereILike('m.title', pattern)
                .orderBy('m.planned_date')
                .limit(limit)
                .select('m.id', 'm.project_id', 'p.name as project_name', 'm.title', 'm.source as subtitle'),
        ]);
        // A project is its own context, so it repeats its name rather than carrying another's.
        return {
            projects: projects.map((row) => ({ ...row, project_name: row.title })),
            risks,
            changeRequests,
            milestones,
        };
    }
}
