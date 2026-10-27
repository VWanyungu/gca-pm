import express from 'express';
import { StageStateHistory, ProjectStages, Projects, } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { stageStateHistoryProjectParamsSchema, stageStateHistoryEventParamsSchema, createStageStateHistorySchema, updateStageStateHistorySchema, listStageStateHistoryQuerySchema, } from '../utils/validation.js';
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
const ALLOWED_EVENT_TRANSITIONS = {
    activated: {
        from: ['not_started', 'inactive', null],
        to: ['active'],
    },
    deactivated: {
        from: ['active'],
        to: ['inactive'],
    },
    completed: {
        from: ['not_started', 'active', 'inactive'],
        to: ['complete'],
    },
    reopened: {
        from: ['complete'],
        to: ['active'],
    },
    added_to_scope: {
        from: ['not_started', 'active', 'inactive', 'complete', null],
        to: ['not_started', 'active', 'inactive', 'complete'],
    },
    removed_from_scope: {
        from: ['not_started', 'complete', 'active', 'inactive', null],
        to: ['not_started', 'inactive', 'complete'],
    },
};
router.post('/', canManage, async (req, res) => {
    const params = stageStateHistoryProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = createStageStateHistorySchema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId } = params.value;
    const input = body.value;
    try {
        // Check if project exists
        const project = await Projects.getById(projectId);
        if (!project) {
            res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
            return;
        }
        // Check project_stage
        const existingProjectStage = await ProjectStages.get(projectId, input.stage_no);
        if (!existingProjectStage) {
            if (input.event !== 'added_to_scope') {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'Stage is not in project scope. Edit the project scope first.',
                });
                return;
            }
        }
        else {
            // If stage exists but in_scope is false, activating requires adding to scope first (AC-STG-03, FR-M03-001)
            if (!existingProjectStage.in_scope && input.event === 'activated') {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'Edit the project scope first',
                });
                return;
            }
        }
        const fromState = input.from_state !== undefined
            ? input.from_state
            : (existingProjectStage ? existingProjectStage.state : null);
        // Validate transition
        const allowed = ALLOWED_EVENT_TRANSITIONS[input.event];
        if (allowed) {
            if (!allowed.from.includes(fromState)) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: `Illegal transition for event '${input.event}': cannot transition from '${fromState ?? 'none'}'`,
                });
                return;
            }
            if (!allowed.to.includes(input.to_state)) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: `Illegal transition for event '${input.event}': destination state '${input.to_state}' is not allowed`,
                });
                return;
            }
        }
        // Enforce DB constraints: ck_ssh_snapshot_on_complete & ck_ssh_notes_on_complete
        let checklistSnapshot = null;
        let closureNotes = null;
        if (input.event === 'completed') {
            checklistSnapshot = input.checklist_snapshot ?? { template_id: null, items: [] };
            closureNotes = input.closure_notes ?? null;
        }
        // Atomic transition through database class
        const created = await StageStateHistory.recordTransition({
            projectId,
            stageNo: input.stage_no,
            event: input.event,
            fromState,
            toState: input.to_state,
            reason: input.reason ?? null,
            checklistSnapshot,
            closureNotes,
            actorId: req.user.userId,
            submissionId: input.submission_id ?? null,
            updateProjectStage: input.update_project_stage !== false,
        });
        res.status(201).json({
            status: 'success',
            data: { stageStateHistory: created },
            message: 'Stage state history record created',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.get('/', canView, async (req, res) => {
    const params = stageStateHistoryProjectParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const query = listStageStateHistoryQuerySchema.validate(req.query, { abortEarly: false });
    if (query.error) {
        res.status(400).json({ status: 'error', data: null, message: query.error.message });
        return;
    }
    const { projectId } = params.value;
    const { stage_no, event, page, limit } = query.value;
    try {
        const result = await StageStateHistory.list({
            projectId,
            stageNo: stage_no,
            event,
            page,
            limit,
        });
        res.status(200).json({
            status: 'success',
            data: result,
            message: 'Stage state history retrieved',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.get('/:eventId', canView, async (req, res) => {
    const params = stageStateHistoryEventParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, eventId } = params.value;
    try {
        const stageStateHistory = await StageStateHistory.getById(projectId, eventId);
        if (!stageStateHistory) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage state history record not found' });
            return;
        }
        res.status(200).json({
            status: 'success',
            data: { stageStateHistory },
            message: 'Stage state history record retrieved',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.patch('/:eventId', canManage, async (req, res) => {
    const params = stageStateHistoryEventParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const body = updateStageStateHistorySchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
    if (body.error) {
        res.status(400).json({ status: 'error', data: null, message: body.error.message });
        return;
    }
    const { projectId, eventId } = params.value;
    const patch = body.value;
    try {
        const existing = await StageStateHistory.getById(projectId, eventId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage state history record not found' });
            return;
        }
        // Check constraint validation
        if (existing.event === 'completed') {
            if (patch.checklist_snapshot === null) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'checklist_snapshot cannot be null for completed stage event',
                });
                return;
            }
        }
        else {
            if (patch.checklist_snapshot !== undefined && patch.checklist_snapshot !== null) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'checklist_snapshot must be null for non-completed stage events',
                });
                return;
            }
            if (patch.closure_notes !== undefined && patch.closure_notes !== null) {
                res.status(400).json({
                    status: 'error',
                    data: null,
                    message: 'closure_notes must be null for non-completed stage events',
                });
                return;
            }
        }
        const updated = await StageStateHistory.update(projectId, eventId, patch);
        res.status(200).json({
            status: 'success',
            data: { stageStateHistory: updated },
            message: 'Stage state history record updated',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
router.delete('/:eventId', canManage, async (req, res) => {
    const params = stageStateHistoryEventParamsSchema.validate(req.params);
    if (params.error) {
        res.status(400).json({ status: 'error', data: null, message: params.error.message });
        return;
    }
    const { projectId, eventId } = params.value;
    try {
        const existing = await StageStateHistory.getById(projectId, eventId);
        if (!existing) {
            res.status(404).json({ status: 'error', data: null, message: 'Stage state history record not found' });
            return;
        }
        const deleted = await StageStateHistory.delete(projectId, eventId);
        res.status(200).json({
            status: 'success',
            data: { stageStateHistory: deleted },
            message: 'Stage state history record deleted',
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        res.status(500).json({ status: 'error', data: null, message });
    }
});
export default router;
