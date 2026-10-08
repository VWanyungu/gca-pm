import express from 'express';
import { RiskCategories } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
    createRiskCategorySchema,
    updateRiskCategorySchema,
    riskCategoryIdParamSchema,
    listRiskCategoriesQuerySchema,
    type CreateRiskCategoryBody,
    type UpdateRiskCategoryBody,
    type ListRiskCategoriesQuery,
} from '../utils/validation.js';

const router = express.Router();

const canManage = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
    { role: 'PM', scopeType: 'program' },
    { role: 'Admin', scopeType: 'project' },
]);

router.post('/', canManage, async (req, res) => {
    const { error, value } = createRiskCategorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }

    try {
        const existing = await RiskCategories.getByCode((value as CreateRiskCategoryBody).code);
        if (existing) {
            res.status(409).json({ status: 'error', data: null, message: 'Risk category code already exists' });
            return;
        }
        const category = await RiskCategories.create(value as CreateRiskCategoryBody);
        res.status(201).json({ status: 'success', data: { category }, message: 'Risk category created' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/', canManage, async (req, res) => {
    const { error, value } = listRiskCategoriesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { includeInactive, page, limit } = value as ListRiskCategoriesQuery;

    try {
        const result = await RiskCategories.list({ includeInactive, page, limit });
        res.status(200).json({ status: 'success', data: result, message: 'Risk categories retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/:id', canManage, async (req, res) => {
    const {value, error} = riskCategoryIdParamSchema.validate(req.params);
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { id } = value as { id: number };

    try {
        const category = await RiskCategories.getById(id);
        if (!category) {
            res.status(404).json({ status: 'error', data: null, message: 'Risk category not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: { category }, message: 'Risk category retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.patch('/:id', canManage, async (req, res) => {
    const params = riskCategoryIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateRiskCategorySchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { id } = params.value as { id: number };
    const update = body.value as UpdateRiskCategoryBody;

    try {
        const existing = await RiskCategories.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Risk category not found' });
            return;
        }

        if (existing.is_system && update.code !== undefined && update.code !== existing.code) {
            res.status(403).json({ status: 'error', data: null, message: 'System risk category code cannot be changed' });
            return;
        }
        if (existing.is_system && update.is_active === false) {
            res.status(403).json({ status: 'error', data: null, message: 'System risk category cannot be deactivated' });
            return;
        }
        if (update.code && update.code !== existing.code) {
            const clash = await RiskCategories.getByCode(update.code);
            if (clash) {
                res.status(409).json({ status: 'error', data: null, message: 'Risk category code already exists' });
                return;
            }
        }

        const category = await RiskCategories.update(id, update);
        res.status(200).json({ status: 'success', data: { category }, message: 'Risk category updated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.delete('/:id', canManage, async (req, res) => {
    const params = riskCategoryIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { id } = params.value as { id: number };

    try {
        const existing = await RiskCategories.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Risk category not found' });
            return;
        }
        
        if (existing.is_system) {
            res.status(403).json({ status: 'error', data: null, message: 'System risk category cannot be deleted' });
            return;
        }

        const category = await RiskCategories.deactivate(id);
        res.status(200).json({ status: 'success', data: { category }, message: 'Risk category deactivated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
