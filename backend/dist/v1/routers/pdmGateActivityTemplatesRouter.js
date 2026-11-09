import express from 'express';
import { PdmGateActivityTemplates } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { sendRouteError } from '../utils/errors.js';
import { createGateActivityTemplateSchema, updateGateActivityTemplateSchema, gateActivityTemplateIdParamSchema, listGateActivityTemplatesQuerySchema, } from '../utils/validation.js';
const router = express.Router();
const canManage = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
    { role: 'PM', scopeType: 'program' },
    { role: 'Admin', scopeType: 'project' },
]);
router.post('/', canManage, async (req, res) => {
    const { error, value } = createGateActivityTemplateSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    try {
        const template = await PdmGateActivityTemplates.create(value, req.user.userId);
        res.status(201).json({ status: 'success', data: { template }, message: 'Gate activity template created' });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.get('/', canManage, async (req, res) => {
    const { error, value } = listGateActivityTemplatesQuerySchema.validate(req.query, { abortEarly: false });
    if (error) {
        res.status(400).json({ status: 'error', data: null, message: error.message });
        return;
    }
    const { stage_no, includeInactive } = value;
    try {
        const templates = await PdmGateActivityTemplates.list({ stageNo: stage_no, includeInactive });
        res.status(200).json({ status: 'success', data: { templates }, message: 'Gate activity templates retrieved' });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.patch('/:templateId', canManage, async (req, res) => {
    const params = gateActivityTemplateIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateGateActivityTemplateSchema.validate(req.body ?? {}, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { templateId } = params.value;
    const update = body.value;
    try {
        const existing = await PdmGateActivityTemplates.getById(templateId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Gate activity template not found' });
            return;
        }
        const template = await PdmGateActivityTemplates.update(templateId, update, req.user.userId);
        res.status(200).json({ status: 'success', data: { template }, message: 'Gate activity template updated' });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.delete('/:templateId', canManage, async (req, res) => {
    const params = gateActivityTemplateIdParamSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { templateId } = params.value;
    try {
        const existing = await PdmGateActivityTemplates.getById(templateId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Gate activity template not found' });
            return;
        }
        const template = await PdmGateActivityTemplates.deactivate(templateId, req.user.userId);
        res.status(200).json({ status: 'success', data: { template }, message: 'Gate activity template deactivated' });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
export default router;
