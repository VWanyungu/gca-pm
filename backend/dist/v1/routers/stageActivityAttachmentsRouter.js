import express from 'express';
import { randomUUID } from 'crypto';
import { StageActivityAttachments, StageActivities, Projects, FileObjects, } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { stageActivityAttachmentListParamsSchema, stageActivityAttachmentParamsSchema, listStageActivityAttachmentsQuerySchema, createStageActivityAttachmentSchema, updateStageActivityAttachmentSchema, } from '../utils/validation.js';
import { storeObject, objectUrl, FileValidationError, FileStorageError } from '../utils/objectStorage.js';
import { sendRouteError } from '../utils/errors.js';
// mergeParams so :projectId and :activityId reach authorize + handlers.
const router = express.Router({ mergeParams: true });
const canView = authorize([
    { role: 'PM', scopeType: 'global' },
    { role: 'PM', scopeType: 'project' },
    { role: 'Planner', scopeType: 'project' },
    { role: 'SiteEngineer', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
const canManage = authorize([
    { role: 'PM', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
router.post('/', canManage, async (req, res) => {
    const params = stageActivityAttachmentListParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = createStageActivityAttachmentSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, activityId } = params.value;
    const input = body.value;
    try {
        const project = await Projects.getById(projectId);
        if (!project) {
            res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
            return;
        }
        const activity = await StageActivities.getById(projectId, activityId);
        if (!activity) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        // AC-STG-09: Maximum 20 attachments per activity
        const existingAttachments = await StageActivityAttachments.list({ activityId, includeRemoved: false });
        if (existingAttachments.length >= 20) {
            res.status(400).json({
                status: 'error',
                data: null,
                message: 'Maximum limit of 20 attachments per activity reached',
            });
            return;
        }
        // AC-STG-09: attachments register a real file_object (purpose/variant/status, sha256, size)
        // before being linked here — either freshly uploaded now, or a file_id from a prior upload.
        let fileId;
        let accessUrl;
        if (input.file) {
            const { fileObject, url } = await storeObject({
                file: input.file,
                purpose: 'activity_attachment',
                projectId,
                uploadedBy: req.user.userId,
                originalFilename: input.caption || 'attachment',
            });
            fileId = fileObject.file_id;
            accessUrl = url;
        }
        else if (input.file_id) {
            // AC-GEN-10: the referenced file must belong to this same project.
            const fileObject = await FileObjects.getById(input.file_id);
            if (!fileObject || fileObject.project_id !== projectId) {
                res.status(404).json({ status: 'error', data: null, message: 'File not found' });
                return;
            }
            fileId = fileObject.file_id;
            accessUrl = objectUrl(fileObject);
        }
        else {
            res.status(400).json({ status: 'error', data: null, message: 'file or file_id is required' });
            return;
        }
        const created = await StageActivityAttachments.create({
            attachment_id: randomUUID(),
            activity_id: activityId,
            file_id: fileId,
            caption: input.caption ?? null,
            access_url: accessUrl,
            sort_order: input.sort_order ?? 0,
            uploaded_by: req.user.userId,
        });
        res.status(201).json({
            status: 'success',
            data: { attachment: created },
            message: 'Stage activity attachment created',
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
        sendRouteError(res, err);
    }
});
router.get('/', canView, async (req, res) => {
    const params = stageActivityAttachmentListParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const query = listStageActivityAttachmentsQuerySchema.validate(req.query, { abortEarly: false });
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const { projectId, activityId } = params.value;
    const { includeRemoved } = query.value;
    try {
        const activity = await StageActivities.getById(projectId, activityId);
        if (!activity) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        const attachments = await StageActivityAttachments.list({
            activityId,
            includeRemoved,
        });
        res.status(200).json({
            status: 'success',
            data: { attachments },
            message: 'Stage activity attachments retrieved',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.get('/:attachmentId', canView, async (req, res) => {
    const params = stageActivityAttachmentParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, activityId, attachmentId } = params.value;
    try {
        const activity = await StageActivities.getById(projectId, activityId);
        if (!activity) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        const attachment = await StageActivityAttachments.getById(attachmentId, activityId);
        if (!attachment) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity attachment not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: { attachment },
            message: 'Stage activity attachment retrieved',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.patch('/:attachmentId', canManage, async (req, res) => {
    const params = stageActivityAttachmentParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateStageActivityAttachmentSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, activityId, attachmentId } = params.value;
    const patch = body.value;
    try {
        const activity = await StageActivities.getById(projectId, activityId);
        if (!activity) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        const existing = await StageActivityAttachments.getById(attachmentId, activityId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity attachment not found' });
            return;
        }
        const updates = { ...patch };
        const updated = await StageActivityAttachments.update(attachmentId, updates);
        res.status(200).json({
            status: 'success',
            data: { attachment: updated },
            message: 'Stage activity attachment updated',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.delete('/:attachmentId', canManage, async (req, res) => {
    const params = stageActivityAttachmentParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, activityId, attachmentId } = params.value;
    try {
        const activity = await StageActivities.getById(projectId, activityId);
        if (!activity) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        const existing = await StageActivityAttachments.getById(attachmentId, activityId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity attachment not found' });
            return;
        }
        // AC-STG-09: Removal is soft remove (removed_by, removed_at)
        const removed = await StageActivityAttachments.softDelete(attachmentId, req.user.userId);
        res.status(200).json({
            status: 'success',
            data: { attachment: removed },
            message: 'Stage activity attachment removed',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
export default router;
