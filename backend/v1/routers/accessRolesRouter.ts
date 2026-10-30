import express from 'express';
import { AccessRoles } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { authorizeAnyRole } from '../middlewares/authorize.js';
import {
    createAccessRoleSchema,
    updateAccessRoleSchema,
    accessRoleIdParamSchema,
    listAccessRolesQuerySchema,
    type CreateAccessRoleBody,
    type UpdateAccessRoleBody,
    type ListAccessRolesQuery,
} from '../utils/validation.js';

const router = express.Router();

// Reference data read by every "grant access" screen — any grant of these roles can list it,
// same breadth as personnelRolesRouter's canListPersonnelRoles.
const canList = authorizeAnyRole(['ExCo', 'Admin', 'PM', 'Planner', 'SiteEngineer', 'ProjectCreator']);

// Managing the catalog itself (create/rename/deactivate) is Admin-only.
const canManage = authorize([{ role: 'Admin', scopeType: 'global' }]);

router.get('/', canList, async (req, res) => {
    const { error, value } = listAccessRolesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { includeInactive } = value as ListAccessRolesQuery;

    try {
        const roles = await AccessRoles.list({ includeInactive });
        res.status(200).json({ status: 'success', data: { roles }, message: 'Roles retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.post('/', canManage, async (req, res) => {
    const { error, value } = createAccessRoleSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }

    try {
        const existing = await AccessRoles.getByName((value as CreateAccessRoleBody).name);
        if (existing) {
            res.status(409).json({ status: 'error', data: null, message: 'Role name already exists' });
            return;
        }
        const role = await AccessRoles.create(value as CreateAccessRoleBody);
        res.status(201).json({ status: 'success', data: { role }, message: 'Role created' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.patch('/:id', canManage, async (req, res) => {
    const params = accessRoleIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateAccessRoleSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { id } = params.value as { id: number };
    const update = body.value as UpdateAccessRoleBody;

    try {
        const existing = await AccessRoles.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Role not found' });
            return;
        }
        if (existing.is_system && update.name !== undefined && update.name !== existing.name) {
            res.status(403).json({ status: 'error', data: null, message: 'System role name cannot be changed' });
            return;
        }
        if (existing.is_system && update.is_active === false) {
            res.status(403).json({ status: 'error', data: null, message: 'System role cannot be deactivated' });
            return;
        }
        if (update.name && update.name !== existing.name) {
            const clash = await AccessRoles.getByName(update.name);
            if (clash) {
                res.status(409).json({ status: 'error', data: null, message: 'Role name already exists' });
                return;
            }
        }

        const role = await AccessRoles.update(id, update);
        res.status(200).json({ status: 'success', data: { role }, message: 'Role updated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.delete('/:id', canManage, async (req, res) => {
    const params = accessRoleIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { id } = params.value as { id: number };

    try {
        const existing = await AccessRoles.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Role not found' });
            return;
        }
        if (existing.is_system) {
            res.status(403).json({ status: 'error', data: null, message: 'System role cannot be deleted' });
            return;
        }

        const role = await AccessRoles.deactivate(id);
        res.status(200).json({ status: 'success', data: { role }, message: 'Role deactivated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
