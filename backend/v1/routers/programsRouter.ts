import express from 'express';
import { Programs } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
    createProgramSchema,
    updateProgramSchema,
    programIdParamSchema,
    listProgramsQuerySchema,
    type CreateProgramBody,
    type UpdateProgramBody,
    type ListProgramsQuery,
} from '../utils/validation.js';

const router = express.Router();

const canManage = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);

const canListPrograms = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
    { role: 'PM', scopeType: 'global' },
    { role: 'Planner', scopeType: 'global' },
    { role: 'SiteEngineer', scopeType: 'global' },
    { role: 'ProjectCreator', scopeType: 'global' },
]);

router.post('/', canManage, async (req, res) => {
    const { error, value } = createProgramSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const input = value as CreateProgramBody;

    try {
        const clash = await Programs.getByName(input.name);
        if (clash) {
            res.status(409).json({ status: 'error', data: null, message: 'Program name already exists' });
            return;
        }
        const program = await Programs.create(input);
        res.status(201).json({ status: 'success', data: { program }, message: 'Program created' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/', canListPrograms, async (req, res) => {
    const { error, value } = listProgramsQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { includeInactive, page, limit } = value as ListProgramsQuery;

    try {
        const result = await Programs.list({ includeInactive, page, limit });
        res.status(200).json({ status: 'success', data: result, message: 'Programs retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/:id', canManage, async (req, res) => {
    const params = programIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { id } = params.value as { id: number };

    try {
        const program = await Programs.getById(id);
        if (!program) {
            res.status(404).json({ status: 'error', data: null, message: 'Program not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: { program }, message: 'Program retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.patch('/:id', canManage, async (req, res) => {
    const params = programIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateProgramSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { id } = params.value as { id: number };
    const patch = body.value as UpdateProgramBody;

    try {
        const existing = await Programs.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Program not found' });
            return;
        }
        if (patch.name && patch.name !== existing.name) {
            const clash = await Programs.getByName(patch.name);
            if (clash) {
                res.status(409).json({ status: 'error', data: null, message: 'Program name already exists' });
                return;
            }
        }

        const program = await Programs.update(id, patch);
        res.status(200).json({ status: 'success', data: { program }, message: 'Program updated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.delete('/:id', canManage, async (req, res) => {
    const params = programIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { id } = params.value as { id: number };

    try {
        const existing = await Programs.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Program not found' });
            return;
        }
        const program = await Programs.deactivate(id);
        res.status(200).json({ status: 'success', data: { program }, message: 'Program deactivated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
