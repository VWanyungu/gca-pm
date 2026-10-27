import express from 'express';
import { ChangeRequests } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { createChangeRequestSchema, updateChangeRequestSchema, decideChangeRequestSchema, listChangeRequestsQuerySchema, changeRequestProjectParamsSchema, changeRequestParamsSchema, uploadChangeRequestAttachmentSchema, } from '../utils/validation.js';
import { storeObject, FileValidationError, FileStorageError } from '../utils/objectStorage.js';
// mergeParams so :projectId from the parent mount reaches authorize + handlers.
const router = express.Router({ mergeParams: true });
const canView = authorize([
    { role: 'PM', scopeType: 'global' },
    { role: 'PM', scopeType: 'project' },
    { role: 'Planner', scopeType: 'project' },
    { role: 'SiteEngineer', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
// AC-CHG-01: raised by the project's PM or the Site Engineer on their own project.
const canRaise = authorize([
    { role: 'PM', scopeType: 'project' },
    { role: 'SiteEngineer', scopeType: 'project' },
    { role: 'Admin', scopeType: 'global' },
]);
// AC-CHG-02: decided by ExCo only.
const canDecide = authorize([
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
// POST /projects/:projectId/change-requests/attachments/upload
// Registered before /:changeId routes so "attachments" isn't captured as a changeId param.
// Mirrors dprRouter.ts's /photos/upload: the change request may not exist yet (raised in the
// same form submission), so this just stores the object and hands back a file_id to attach.
router.post('/attachments/upload', canRaise, async (req, res) => {
    const params = changeRequestProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = uploadChangeRequestAttachmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId } = params.value;
    const input = body.value;
    try {
        const { fileObject, url } = await storeObject({
            file: input.file,
            purpose: 'change_request_attachment',
            projectId,
            uploadedBy: req.user.userId,
            originalFilename: input.filename,
        });
        res.status(201).json({
            status: 'success',
            data: { file_id: fileObject.file_id, url, original_filename: fileObject.original_filename },
            message: 'File uploaded',
        });
    }
    catch (err) {
        if (err instanceof FileValidationError) {
            res.status(400).json({ status: 'error', data: null, message: err.message });
            return;
        }
        if (err instanceof FileStorageError) {
            res.status(502).json({ status: 'error', data: null, message: `Could not store the file: ${err.message}` });
            return;
        }
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.post('/', canRaise, async (req, res) => {
    const params = changeRequestProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = createChangeRequestSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId } = params.value;
    const input = body.value;
    try {
        const created = await ChangeRequests.create({
            project_id: projectId,
            stage_no: input.stage_no ?? null,
            type: input.type,
            title: input.title,
            scope_description: input.scope_description,
            reason: input.reason,
            supporting_notes: input.supporting_notes ?? null,
            cost_impact: input.cost_impact ?? null,
            cost_currency: input.cost_currency ?? null,
            schedule_impact_days: input.schedule_impact_days ?? null,
            raised_by: req.user.userId,
            attachmentFileIds: input.attachment_file_ids,
        });
        res.status(201).json({ status: 'success', data: { changeRequest: created }, message: 'Change request raised' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.get('/', canView, async (req, res) => {
    const params = changeRequestProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const query = listChangeRequestsQuerySchema.validate(req.query, { abortEarly: false });
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const { projectId } = params.value;
    const { stage_no, type, status, search, page, limit } = query.value;
    try {
        const result = await ChangeRequests.list({ projectId, stageNo: stage_no, type, status, search, page, limit });
        res.status(200).json({ status: 'success', data: result, message: 'Change requests retrieved' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.get('/:changeId', canView, async (req, res) => {
    const params = changeRequestParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, changeId } = params.value;
    try {
        const changeRequest = await ChangeRequests.getById(projectId, changeId);
        if (!changeRequest) {
            res.status(404).json({ status: 'error', data: null, message: 'Change request not found' });
            return;
        }
        res.status(200).json({ status: 'success', data: { changeRequest }, message: 'Change request retrieved' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.patch('/:changeId', canRaise, async (req, res) => {
    const params = changeRequestParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateChangeRequestSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, changeId } = params.value;
    const { attachment_file_ids: attachmentFileIds, ...patch } = body.value;
    try {
        const existing = await ChangeRequests.getById(projectId, changeId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Change request not found' });
            return;
        }
        // Only the raiser (or Admin, who passes canRaise unconditionally) may edit.
        const isAdmin = req.user.role.some((r) => r.role === 'Admin' && r.scope_type === 'global');
        if (!isAdmin && existing.raised_by !== req.user.userId) {
            res.status(403).json({ status: 'error', data: null, message: 'Only the raiser can edit this change request' });
            return;
        }
        // Approved is editable while ExCo review is switched off, since every raise lands there
        // (see ChangeRequests.create). Rejected and withdrawn stay closed: those are decisions.
        if (existing.status !== 'pending' && existing.status !== 'approved') {
            res.status(400).json({
                status: 'error',
                data: null,
                message: 'Rejected and withdrawn change requests cannot be edited',
            });
            return;
        }
        const updated = await ChangeRequests.update(projectId, changeId, patch, attachmentFileIds, req.user.userId);
        res.status(200).json({ status: 'success', data: { changeRequest: updated }, message: 'Change request updated' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// POST /:changeId/decide (AC-CHG-02 & AC-CHG-03: ExCo only)
router.post('/:changeId/decide', canDecide, async (req, res) => {
    const params = changeRequestParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = decideChangeRequestSchema.validate(req.body ?? {}, { abortEarly: false });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, changeId } = params.value;
    const { decision, comment } = body.value;
    try {
        const result = await ChangeRequests.decide({
            changeId,
            projectId,
            approverId: req.user.userId,
            decision,
            comment,
        });
        if (result.alreadyDecided) {
            if (!result.current) {
                res.status(404).json({ status: 'error', data: null, message: 'Change request not found' });
                return;
            }
            res.status(409).json({
                status: 'error',
                data: result.current,
                message: `Already decided (${result.current.status})`,
            });
            return;
        }
        res.status(200).json({ status: 'success', data: { changeRequest: result.changeRequest }, message: 'Change request decided' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
// POST /:changeId/withdraw (AC-CHG-04: only the raiser, only while pending)
router.post('/:changeId/withdraw', canRaise, async (req, res) => {
    const params = changeRequestParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, changeId } = params.value;
    try {
        const existing = await ChangeRequests.getById(projectId, changeId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Change request not found' });
            return;
        }
        const isAdmin = req.user.role.some((r) => r.role === 'Admin' && r.scope_type === 'global');
        if (!isAdmin && existing.raised_by !== req.user.userId) {
            res.status(403).json({ status: 'error', data: null, message: 'Only the raiser can withdraw this change request' });
            return;
        }
        const withdrawn = await ChangeRequests.withdraw(projectId, changeId, existing.raised_by);
        if (!withdrawn) {
            res.status(400).json({ status: 'error', data: null, message: 'Only pending change requests can be withdrawn' });
            return;
        }
        res.status(200).json({ status: 'success', data: { changeRequest: withdrawn }, message: 'Change request withdrawn' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
export default router;
