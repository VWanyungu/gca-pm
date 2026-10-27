import express from 'express';
import { Contractors } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { createContractorSchema, updateContractorSchema, mergeContractorSchema, listContractorsQuerySchema, contractorIdParamSchema, } from '../utils/validation.js';
const router = express.Router();
const canCreate = authorize([
    { role: 'Admin', scopeType: 'global' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'PM', scopeType: 'global' },
    { role: 'SiteEngineer', scopeType: 'global' },
    { role: 'Planner', scopeType: 'global' },
    { role: 'ProjectCreator', scopeType: 'global' },
]);
const canList = authorize([
    { role: 'Admin', scopeType: 'global' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'PM', scopeType: 'global' },
    { role: 'Planner', scopeType: 'global' },
    { role: 'SiteEngineer', scopeType: 'global' },
    { role: 'ProjectCreator', scopeType: 'global' },
]);
const canManage = authorize([
    { role: 'Admin', scopeType: 'global' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'PM', scopeType: 'global' },
]);
const canMerge = authorize([
    { role: 'Admin', scopeType: 'global' },
]);
// POST /contractors
router.post('/', canCreate, async (req, res) => {
    const body = createContractorSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const input = body.value;
    try {
        const existing = await Contractors.getByName(input.name);
        if (existing) {
            res.status(409).json({
                status: 'error',
                data: null,
                message: `Contractor with name '${input.name}' already exists`,
            });
            return;
        }
        const created = await Contractors.create({
            ...input,
            created_by: req.user.userId,
        });
        res.status(201).json({
            status: 'success',
            data: { contractor: created },
            message: 'Contractor created',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// GET /contractors
router.get('/', canList, async (req, res) => {
    const query = listContractorsQuerySchema.validate(req.query, { abortEarly: false });
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const filter = query.value;
    try {
        const result = await Contractors.list({
            search: filter.search,
            includeInactive: filter.includeInactive,
            includeMerged: filter.includeMerged,
            page: filter.page,
            limit: filter.limit,
        });
        res.status(200).json({
            status: 'success',
            data: result,
            message: 'Contractors retrieved',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// GET /contractors/:contractorId
router.get('/:contractorId', canList, async (req, res) => {
    const params = contractorIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { contractorId } = params.value;
    try {
        const contractor = await Contractors.getById(contractorId);
        if (!contractor) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not found' });
            return;
        }
        let mergedInto = null;
        if (contractor.merged_into_id) {
            mergedInto = await Contractors.getById(contractor.merged_into_id);
        }
        res.status(200).json({
            status: 'success',
            data: { contractor, mergedInto },
            message: 'Contractor retrieved',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// PATCH /contractors/:contractorId
router.patch('/:contractorId', canManage, async (req, res) => {
    const params = contractorIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateContractorSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { contractorId } = params.value;
    const input = body.value;
    try {
        const existing = await Contractors.getById(contractorId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not found' });
            return;
        }
        if (input.name && input.name.trim() !== existing.name) {
            const clash = await Contractors.getByName(input.name);
            if (clash && clash.contractor_id !== contractorId) {
                res.status(409).json({
                    status: 'error',
                    data: null,
                    message: `Contractor with name '${input.name}' already exists`,
                });
                return;
            }
        }
        const updated = await Contractors.update(contractorId, input);
        res.status(200).json({
            status: 'success',
            data: { contractor: updated },
            message: 'Contractor updated',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// POST /contractors/:contractorId/merge (AC-IAM-08: Admin only)
router.post('/:contractorId/merge', canMerge, async (req, res) => {
    const params = contractorIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = mergeContractorSchema.validate(req.body);
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { contractorId } = params.value;
    const { target_contractor_id } = body.value;
    try {
        const merged = await Contractors.merge(contractorId, target_contractor_id);
        res.status(200).json({
            status: 'success',
            data: { contractor: merged },
            message: `Contractor merged into target contractor ${target_contractor_id}`,
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('not found') ||
            message.includes('Cannot merge') ||
            message.includes('Merge chains are not allowed')) {
            res.status(400).json({ status: 'error', data: null, message });
            return;
        }
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// DELETE /contractors/:contractorId (Soft deactivate or delete)
router.delete('/:contractorId', canManage, async (req, res) => {
    const params = contractorIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { contractorId } = params.value;
    try {
        const existing = await Contractors.getById(contractorId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Contractor not found' });
            return;
        }
        // Soft deactivate per system standard
        await Contractors.update(contractorId, { is_active: false });
        res.status(200).json({
            status: 'success',
            data: null,
            message: 'Contractor deactivated',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
export default router;
