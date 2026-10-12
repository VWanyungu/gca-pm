import express from 'express';
import { WeatherCategories } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
    createWeatherCategorySchema,
    updateWeatherCategorySchema,
    weatherCategoryIdParamSchema,
    listWeatherCategoriesQuerySchema,
    type CreateWeatherCategoryBody,
    type UpdateWeatherCategoryBody,
    type ListWeatherCategoriesQuery,
} from '../utils/validation.js';

const router = express.Router();

// AC-IAM-09: reference data managed by Admin/ExCo; deletion is soft deactivate.
const canManage = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);

const canListWeatherCategories = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
    { role: 'PM', scopeType: 'global' },
    { role: 'Planner', scopeType: 'global' },
    { role: 'SiteEngineer', scopeType: 'global' },
    { role: 'ProjectCreator', scopeType: 'global' },
]);

router.post('/', canManage, async (req, res) => {
    const { error, value } = createWeatherCategorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const input = value as CreateWeatherCategoryBody;

    try {
        const clash = await WeatherCategories.getByName(input.name);
        if (clash) {
            res.status(409).json({ status: 'error', data: null, message: 'Weather category name already exists' });
            return;
        }
        const category = await WeatherCategories.create(input);
        res.status(201).json({ status: 'success', data: { category }, message: 'Weather category created' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/', canListWeatherCategories, async (req, res) => {
    const { error, value } = listWeatherCategoriesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { includeInactive, page, limit } = value as ListWeatherCategoriesQuery;

    try {
        const result = await WeatherCategories.list({ includeInactive, page, limit });
        res.status(200).json({ status: 'success', data: result, message: 'Weather categories retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.get('/:id', canListWeatherCategories, async (req, res) => {
    const params = weatherCategoryIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { id } = params.value as { id: number };

    try {
        const category = await WeatherCategories.getById(id);
        if (!category) {
            res.status(404).json({ status: 'error', data: null, message: 'Weather category not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: { category }, message: 'Weather category retrieved' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.patch('/:id', canManage, async (req, res) => {
    const params = weatherCategoryIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateWeatherCategorySchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { id } = params.value as { id: number };
    const patch = body.value as UpdateWeatherCategoryBody;

    try {
        const existing = await WeatherCategories.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Weather category not found' });
            return;
        }
        if (patch.name && patch.name !== existing.name) {
            const clash = await WeatherCategories.getByName(patch.name);
            if (clash) {
                res.status(409).json({ status: 'error', data: null, message: 'Weather category name already exists' });
                return;
            }
        }

        const category = await WeatherCategories.update(id, patch);
        res.status(200).json({ status: 'success', data: { category }, message: 'Weather category updated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

router.delete('/:id', canManage, async (req, res) => {
    const params = weatherCategoryIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { id } = params.value as { id: number };

    try {
        const existing = await WeatherCategories.getById(id);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Weather category not found' });
            return;
        }
        const category = await WeatherCategories.deactivate(id);
        res.status(200).json({ status: 'success', data: { category }, message: 'Weather category deactivated' });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});

export default router;
