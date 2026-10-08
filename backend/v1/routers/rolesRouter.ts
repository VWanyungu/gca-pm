import express from 'express';
import { randomUUID } from 'crypto';
import { Roles } from '../database/utils/database.js';
import type { RoleName, ScopeType, RoleGrant } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
    createRoleSchema,
    revokeRoleParamsSchema,
    revokeRoleBodySchema,
    listRolesQuerySchema,
    type CreateRoleBody,
    type RevokeRoleBody,
    type ListRolesQuery,
} from '../utils/validation.js';

const router = express.Router();

const SCOPE_GRANTERS: Record<ScopeType, RoleName[]> = {
    global: ['Admin'],
    program: ['Admin', 'ExCo'],
    project: ['Admin', 'ExCo', 'PM'],
};

function actorCanActOnScope(
    actorRoles: RoleGrant[],
    targetScope: ScopeType,
    targetProgramId: string | null,
    targetProjectId: string | null,
): boolean {
    const allowedRoles = SCOPE_GRANTERS[targetScope];

    return actorRoles.some(role => {
        if (role.role === 'Admin' && role.scope_type === 'global') return true;
        if (!allowedRoles.includes(role.role)) return false;
        if (role.scope_type === 'global') return true;
        if (role.scope_type === 'program' && targetScope === 'program') return role.program_id === targetProgramId;
        if (role.scope_type === 'project' && targetScope === 'project') return role.project_id === targetProjectId;
        return false;
    });
}

const canCreateOrRevoke = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'PM', scopeType: 'project' },
    { role: 'PM', scopeType: 'program' },
    { role: 'Admin', scopeType: 'global' },
]);

router.post('/', canCreateOrRevoke, async (req, res) => {
    const { error, value } = createRoleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { userId, role, scopeType, programId = null, projectId = null } = value as CreateRoleBody;

    if (!actorCanActOnScope(req.user!.role, scopeType, programId != null ? String(programId) : null, projectId ?? null)) {
        res.status(403).json({ status: 'error', data: null, message: 'Not authorized to role at this scope' });
        return;
    }

    try {
        const attributeId = await Roles.grant({
            attribute_id: randomUUID(),
            user_id: userId,
            role,
            scope_type: scopeType,
            program_id: scopeType === 'program' ? Number(programId) : null,
            project_id: scopeType === 'project' ? projectId ?? null : null,
            granted_by: req.user!.userId,
        });
        res.status(201).json({ status: 'success', data: { attributeId }, message: 'Role granted' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/', canCreateOrRevoke, async (req, res) => {
    const { error, value } = listRolesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { userId, page, limit } = value as ListRolesQuery;

    try {
        const result = await Roles.list({ userId, page, limit });
        res.status(200).json({ status: 'success', data: result, message: 'Roles retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.delete('/:attributeId', canCreateOrRevoke, async (req, res) => {
    const params = revokeRoleParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { value, error } = revokeRoleBodySchema.validate(req.body ?? {});
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { attributeId } = params.value as { attributeId: string };
    const { reason = null } = value as RevokeRoleBody;

    try {
        const existingRole = await Roles.getById(attributeId);
        if (!existingRole) {
            res.status(404).json({ status: 'error', data: null, message: 'Role role not found' });
            return;
        }

        if (!actorCanActOnScope(req.user!.role, existingRole.scope_type, existingRole.program_id, existingRole.project_id)) {
            res.status(403).json({ status: 'error', data: null, message: 'Not authorized to revoke at this scope' });
            return;
        }

        const revokedRole = await Roles.revoke(attributeId, req.user!.userId, reason);
        res.status(200).json({ status: 'success', data: { revokedRole }, message: 'Role revoked' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
