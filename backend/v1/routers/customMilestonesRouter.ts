import express from 'express';
import {
  CustomMilestones,
  Projects,
  ProjectStages,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import { sendRouteError } from '../utils/errors.js';
import {
  customMilestoneProjectParamsSchema,
  customMilestoneParamsSchema,
  createCustomMilestoneSchema,
  updateCustomMilestoneSchema,
  listCustomMilestonesQuerySchema,
  type CreateCustomMilestoneBody,
  type UpdateCustomMilestoneBody,
  type ListCustomMilestonesQuery,
} from '../utils/validation.js';

// mergeParams so :projectId reaches authorize and handlers
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

// POST /projects/:projectId/custom-milestones
router.post('/', canManage, async (req, res) => {
  const params = customMilestoneProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = createCustomMilestoneSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as CreateCustomMilestoneBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    // AC-SCH-40: If tagged with stage, stage must be in scope for the project
    if (input.stage_no !== null && input.stage_no !== undefined) {
      const stage = await ProjectStages.get(projectId, input.stage_no);
      if (!stage || !stage.in_scope) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'Stage is not in project scope. Edit the project scope first.',
        });
        return;
      }
    }

    const created = await CustomMilestones.create({
      project_id: projectId,
      stage_no: input.stage_no ?? null,
      title: input.title,
      planned_date: input.planned_date,
      forecast_date: input.forecast_date ?? null,
      actual_date: input.actual_date ?? null,
      notes: input.notes ?? null,
      created_by: req.user!.userId,
      updated_by: req.user!.userId,
    });

    res.status(201).json({
      status: 'success',
      data: { milestone: created },
      message: 'Custom milestone created',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// GET /projects/:projectId/custom-milestones
router.get('/', canView, async (req, res) => {
  const params = customMilestoneProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const query = listCustomMilestonesQuerySchema.validate(req.query, { abortEarly: false });
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const filter = query.value as ListCustomMilestonesQuery;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    // If requested, return schedule and custom milestones from the combined view.
    if (filter.aggregate) {
      const allMilestones = await CustomMilestones.listAllMilestones(projectId);
      res.status(200).json({
        status: 'success',
        data: { milestones: allMilestones },
        message: 'All project milestones retrieved',
      });
      return;
    }

    const result = await CustomMilestones.list({
      projectId,
      stageNo: filter.stage_no,
      includeRemoved: filter.includeRemoved,
      page: filter.page,
      limit: filter.limit,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Custom milestones retrieved',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// GET /projects/:projectId/custom-milestones/:milestoneId
router.get('/:milestoneId', canView, async (req, res) => {
  const params = customMilestoneParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, milestoneId } = params.value as { projectId: string; milestoneId: string };

  try {
    const milestone = await CustomMilestones.getById(milestoneId, projectId);
    if (!milestone) {
      res.status(404).json({ status: 'error', data: null, message: 'Custom milestone not found' });
      return;
    }

    // AC-GEN-08: Soft-deleted rows are invisible unless admin
    if (milestone.removed_at) {
      const isAdmin = req.user?.role?.some((r) => r.role === 'Admin' && r.scope_type === 'global');
      if (!isAdmin) {
        res.status(404).json({ status: 'error', data: null, message: 'Custom milestone not found' });
        return;
      }
    }

    res.status(200).json({
      status: 'success',
      data: { milestone },
      message: 'Custom milestone retrieved',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// PATCH /projects/:projectId/custom-milestones/:milestoneId
router.patch('/:milestoneId', canManage, async (req, res) => {
  const params = customMilestoneParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = updateCustomMilestoneSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId, milestoneId } = params.value as { projectId: string; milestoneId: string };
  const input = body.value as UpdateCustomMilestoneBody;

  try {
    const existing = await CustomMilestones.getById(milestoneId, projectId);
    if (!existing || existing.removed_at) {
      res.status(404).json({ status: 'error', data: null, message: 'Custom milestone not found' });
      return;
    }

    // AC-SCH-40: If updating stage_no, stage must be in scope
    if (input.stage_no !== null && input.stage_no !== undefined) {
      const stage = await ProjectStages.get(projectId, input.stage_no);
      if (!stage || !stage.in_scope) {
        res.status(400).json({
          status: 'error',
          data: null,
          message: 'Stage is not in project scope. Edit the project scope first.',
        });
        return;
      }
    }

    const updated = await CustomMilestones.update(milestoneId, {
      ...input,
      updated_by: req.user!.userId,
    });

    res.status(200).json({
      status: 'success',
      data: { milestone: updated },
      message: 'Custom milestone updated',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// DELETE /projects/:projectId/custom-milestones/:milestoneId (AC-GEN-08, AC-SCH-40: Soft remove)
router.delete('/:milestoneId', canManage, async (req, res) => {
  const params = customMilestoneParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, milestoneId } = params.value as { projectId: string; milestoneId: string };

  try {
    const existing = await CustomMilestones.getById(milestoneId, projectId);
    if (!existing || existing.removed_at) {
      res.status(404).json({ status: 'error', data: null, message: 'Custom milestone not found' });
      return;
    }

    await CustomMilestones.softDelete(milestoneId, req.user!.userId);

    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Custom milestone removed',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// POST /projects/:projectId/custom-milestones/:milestoneId/restore
router.post('/:milestoneId/restore', canManage, async (req, res) => {
  const params = customMilestoneParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, milestoneId } = params.value as { projectId: string; milestoneId: string };

  try {
    const existing = await CustomMilestones.getById(milestoneId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Custom milestone not found' });
      return;
    }

    const restored = await CustomMilestones.restore(milestoneId, req.user!.userId);

    res.status(200).json({
      status: 'success',
      data: { milestone: restored },
      message: 'Custom milestone restored',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

export default router;
