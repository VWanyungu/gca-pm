import express from 'express';
import { randomUUID } from 'crypto';
import { StageActivities, StageActivityAttachments, ProjectStages, Projects, FileObjects, } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { stageActivityProjectParamsSchema, stageActivityParamsSchema, listStageActivitiesQuerySchema, createStageActivitySchema, updateStageActivitySchema, } from '../utils/validation.js';
import { storeObject, objectUrl, FileValidationError, FileStorageError } from '../utils/objectStorage.js';
import { sendRouteError } from '../utils/errors.js';
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
const canManage = authorize([
    { role: 'PM', scopeType: 'project' },
    { role: 'ExCo', scopeType: 'global' },
    { role: 'Admin', scopeType: 'global' },
]);
router.post('/', canManage, async (req, res) => {
    const params = stageActivityProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = createStageActivitySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId } = params.value;
    const input = body.value;
    try {
        const project = await Projects.getById(projectId);
        if (!project) {
            res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
            return;
        }
        // Verify stage is in scope for project (AC-STG-08)
        const projectStage = await ProjectStages.get(projectId, input.stage_no);
        if (!projectStage || !projectStage.in_scope) {
            res.status(400).json({
                status: 'error',
                data: null,
                message: 'Stage is not in project scope. Edit the project scope first.',
            });
            return;
        }
        // Collect attachments if provided
        const rawAttachments = [];
        if (input.attachment) {
            rawAttachments.push(input.attachment);
        }
        if (Array.isArray(input.attachments)) {
            rawAttachments.push(...input.attachments);
        }
        // AC-STG-09: Maximum 20 attachments per activity
        if (rawAttachments.length > 20) {
            res.status(400).json({
                status: 'error',
                data: null,
                message: 'Maximum limit of 20 attachments per activity reached',
            });
            return;
        }
        const activityId = randomUUID();
        // Process & upload attachments first (if any) to prevent creating an activity if upload fails
        const processedAttachments = [];
        for (const [i, item] of rawAttachments.entries()) {
            const attObj = typeof item === 'string' ? { file: item } : item;
            // AC-STG-09: register a real file_object before linking it to this activity.
            let fileId;
            let accessUrl;
            if (attObj.file) {
                const { fileObject, url } = await storeObject({
                    file: attObj.file,
                    purpose: 'activity_attachment',
                    projectId,
                    uploadedBy: req.user.userId,
                    originalFilename: attObj.caption || 'attachment',
                });
                fileId = fileObject.file_id;
                accessUrl = url;
            }
            else if (attObj.file_id) {
                // AC-GEN-10: the referenced file must belong to this same project.
                const fileObject = await FileObjects.getById(attObj.file_id);
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
            processedAttachments.push({
                attachment_id: randomUUID(),
                activity_id: activityId,
                file_id: fileId,
                caption: attObj.caption ?? null,
                access_url: accessUrl,
                sort_order: attObj.sort_order ?? i,
                uploaded_by: req.user.userId,
            });
        }
        // Enforce DB constraint ck_activity_completed_at: (status = 'done') = (completed_at IS NOT NULL)
        const isDone = input.status === 'done';
        const completedAt = isDone ? new Date() : null;
        const created = await StageActivities.create({
            activity_id: activityId,
            project_id: projectId,
            stage_no: input.stage_no,
            title: input.title,
            description: input.description ?? null,
            status: input.status ?? 'open',
            due_date: input.due_date ?? null,
            owner_id: input.owner_id ?? null,
            completed_at: completedAt,
            created_by: req.user.userId,
        });
        // Save attachment records via StageActivityAttachments class
        const createdAttachments = [];
        for (const att of processedAttachments) {
            const record = await StageActivityAttachments.create(att);
            createdAttachments.push(record);
        }
        res.status(201).json({
            status: 'success',
            data: {
                stageActivity: created,
                ...(createdAttachments.length > 0 ? { attachments: createdAttachments } : {}),
            },
            message: 'Stage activity created',
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
    const params = stageActivityProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const query = listStageActivitiesQuerySchema.validate(req.query, { abortEarly: false });
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const { projectId } = params.value;
    const { stage_no, status, owner_id, page, limit } = query.value;
    try {
        const result = await StageActivities.list({
            projectId,
            stageNo: stage_no,
            status,
            ownerId: owner_id,
            page,
            limit,
        });
        res.status(200).json({
            status: 'success',
            data: result,
            message: 'Stage activities retrieved',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.get('/:activityId', canView, async (req, res) => {
    const params = stageActivityParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, activityId } = params.value;
    try {
        const stageActivity = await StageActivities.getById(projectId, activityId);
        if (!stageActivity) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: { stageActivity },
            message: 'Stage activity retrieved',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.patch('/:activityId', canManage, async (req, res) => {
    const params = stageActivityParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateStageActivitySchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, activityId } = params.value;
    const patch = body.value;
    try {
        const existing = await StageActivities.getById(projectId, activityId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        // AC-STG-08: Re-tagging is allowed only to a stage that is in_scope = true on the same project
        if (patch.stage_no && patch.stage_no !== existing.stage_no) {
            const targetStage = await ProjectStages.get(projectId, patch.stage_no);
            if (!targetStage || !targetStage.in_scope) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'Target stage is not in project scope. Edit the project scope first.',
                });
                return;
            }
        }
        const updates = { ...patch };
        // Enforce DB constraint ck_activity_completed_at: (status = 'done') = (completed_at IS NOT NULL)
        if (patch.status && patch.status !== existing.status) {
            if (patch.status === 'done') {
                updates.completed_at = new Date();
            }
            else {
                updates.completed_at = null;
            }
        }
        // AC-STG-13: an activity flagged requires_attachment can't be marked done with no live attachment
        if (updates.status === 'done' && existing.requires_attachment) {
            const attachments = await StageActivityAttachments.list({ activityId });
            if (attachments.length === 0) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'This activity requires at least one attachment before it can be marked done',
                });
                return;
            }
        }
        // AC-STG-12: completing the last open activity on a Kickoff/Closure stage auto-completes it
        const { activity: updated, completedStage } = await StageActivities.updateAndAutoComplete(projectId, activityId, updates, req.user.userId);
        res.status(200).json({
            status: 'success',
            data: { stageActivity: updated, ...(completedStage ? { completedStage } : {}) },
            message: 'Stage activity updated',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
router.delete('/:activityId', canManage, async (req, res) => {
    const params = stageActivityParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, activityId } = params.value;
    try {
        const existing = await StageActivities.getById(projectId, activityId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage activity not found' });
            return;
        }
        const deleted = await StageActivities.delete(projectId, activityId);
        res.status(200).json({
            status: 'success',
            data: { stageActivity: deleted },
            message: 'Stage activity deleted',
        });
    }
    catch (err) {
        sendRouteError(res, err);
    }
});
export default router;
