import express from 'express';
import { randomUUID } from 'crypto';
import {
  StageActivities,
  ProjectStages,
  Projects,
  type UpdateStageActivityFields,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  stageActivityProjectParamsSchema,
  stageActivityParamsSchema,
  listStageActivitiesQuerySchema,
  createStageActivitySchema,
  updateStageActivitySchema,
  type CreateStageActivityBody,
  type UpdateStageActivityBody,
  type ListStageActivitiesQuery,
} from '../utils/validation.js';

// mergeParams so :projectId from the parent mount reaches authorize + handlers.
const router = express.Router({ mergeParams: true });

const canView = authorize([
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
  const { projectId } = params.value as { projectId: string };
  const input = body.value as CreateStageActivityBody;

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

    // Enforce DB constraint ck_activity_completed_at: (status = 'done') = (completed_at IS NOT NULL)
    const isDone = input.status === 'done';
    const completedAt = isDone ? new Date() : null;

    const created = await StageActivities.create({
      activity_id: randomUUID(),
      project_id: projectId,
      stage_no: input.stage_no,
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? 'open',
      due_date: input.due_date ?? null,
      owner_id: input.owner_id ?? null,
      completed_at: completedAt,
      created_by: req.user!.userId,
    });

    res.status(201).json({
      status: 'success',
      data: { stageActivity: created },
      message: 'Stage activity created',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
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
  const { projectId } = params.value as { projectId: string };
  const { stage_no, status, owner_id, page, limit } = query.value as ListStageActivitiesQuery;

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.get('/:activityId', canView, async (req, res) => {
  const params = stageActivityParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, activityId } = params.value as { projectId: string; activityId: string };

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
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
  const { projectId, activityId } = params.value as { projectId: string; activityId: string };
  const patch = body.value as UpdateStageActivityBody;

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

    const updates: UpdateStageActivityFields = { ...patch };

    // Enforce DB constraint ck_activity_completed_at: (status = 'done') = (completed_at IS NOT NULL)
    if (patch.status && patch.status !== existing.status) {
      if (patch.status === 'done') {
        updates.completed_at = new Date();
      } else {
        updates.completed_at = null;
      }
    }

    const updated = await StageActivities.update(projectId, activityId, updates);

    res.status(200).json({
      status: 'success',
      data: { stageActivity: updated },
      message: 'Stage activity updated',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.delete('/:activityId', canManage, async (req, res) => {
  const params = stageActivityParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, activityId } = params.value as { projectId: string; activityId: string };

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
