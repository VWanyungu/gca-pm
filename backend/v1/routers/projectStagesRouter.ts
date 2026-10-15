import express from 'express';
import {
  ProjectStages,
  Projects,
  type StageState,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  projectStageProjectParamsSchema,
  projectStageParamsSchema,
  listProjectStagesQuerySchema,
  createProjectStageSchema,
  updateProjectStageSchema,
  type CreateProjectStageBody,
  type UpdateProjectStageBody,
  type ListProjectStagesQuery,
} from '../utils/validation.js';

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

const ALLOWED_STATE_TRANSITIONS: Record<StageState, StageState[]> = {
  not_started: ['active', 'complete'],
  active: ['inactive', 'complete'],
  inactive: ['active', 'complete'],
  complete: ['active'], // Reopen
};

router.post('/', canManage, async (req, res) => {
  const params = projectStageProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = createProjectStageSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as CreateProjectStageBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const existing = await ProjectStages.get(projectId, input.stage_no);
    if (existing) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: `Stage ${input.stage_no} already exists for this project`,
      });
      return;
    }

    const created = await ProjectStages.create({
      projectId,
      stageNo: input.stage_no,
      inScope: input.in_scope ?? true,
      state: input.state ?? 'not_started',
      actorId: req.user!.userId,
      reason: input.reason ?? null,
    });

    res.status(201).json({
      status: 'success',
      data: { projectStage: created },
      message: 'Project stage created',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.get('/', canView, async (req, res) => {
  const params = projectStageProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const query = listProjectStagesQuerySchema.validate(req.query, { abortEarly: false });
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const { in_scope, state } = query.value as ListProjectStagesQuery;

  try {
    const stages = await ProjectStages.list({
      projectId,
      inScope: in_scope,
      state,
    });

    res.status(200).json({
      status: 'success',
      data: { stages },
      message: 'Project stages retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.get('/:stageNo', canView, async (req, res) => {
  const params = projectStageParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, stageNo } = params.value as { projectId: string; stageNo: number };

  try {
    const projectStage = await ProjectStages.get(projectId, stageNo);
    if (!projectStage) {
      res.status(404).json({ status: 'error', data: null, message: 'Project stage not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { projectStage },
      message: 'Project stage retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.patch('/:stageNo', canManage, async (req, res) => {
  const params = projectStageParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = updateProjectStageSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId, stageNo } = params.value as { projectId: string; stageNo: number };
  const patch = body.value as UpdateProjectStageBody;

  try {
    const existing = await ProjectStages.get(projectId, stageNo);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Project stage not found' });
      return;
    }

    // AC-STG-03 & FR-M03-001: Stage must be in scope to be activated
    const effectiveInScope = patch.in_scope !== undefined ? patch.in_scope : existing.in_scope;
    if (patch.state === 'active' && !effectiveInScope) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Edit the project scope first',
      });
      return;
    }

    // AC-PRJ-07: Removing a stage from scope is allowed only when not_started or complete
    if (patch.in_scope === false && existing.in_scope) {
      const targetState = patch.state ?? existing.state;
      if (targetState !== 'not_started' && targetState !== 'complete') {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'Removing a stage from scope is only allowed when state is not_started or complete',
        });
        return;
      }
    }

    // Validate state transition consistency (AC-STG-01)
    if (patch.state && patch.state !== existing.state) {
      const allowed = ALLOWED_STATE_TRANSITIONS[existing.state];
      if (!allowed.includes(patch.state)) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: `Illegal stage transition ${existing.state} → ${patch.state}`,
        });
        return;
      }
    }

    const result = await ProjectStages.transition({
      projectId,
      stageNo,
      toState: patch.state,
      inScope: patch.in_scope,
      actorId: req.user!.userId,
      reason: patch.reason ?? null,
      checklistSnapshot: patch.checklist_snapshot ?? null,
      closureNotes: patch.closure_notes ?? null,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Project stage updated',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.delete('/:stageNo', canManage, async (req, res) => {
  const params = projectStageParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, stageNo } = params.value as { projectId: string; stageNo: number };

  try {
    const existing = await ProjectStages.get(projectId, stageNo);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Project stage not found' });
      return;
    }

    const deleted = await ProjectStages.delete(projectId, stageNo);
    res.status(200).json({
      status: 'success',
      data: { projectStage: deleted },
      message: 'Project stage deleted',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
