import express from 'express';
import { ProjectStages, ProjectStageChecklistItems } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  stageChecklistProjectParamsSchema,
  stageChecklistItemParamsSchema,
  createStageChecklistItemSchema,
  updateStageChecklistItemSchema,
  type CreateStageChecklistItemBody,
  type UpdateStageChecklistItemBody,
} from '../utils/validation.js';

// mergeParams so :projectId and :stageNo from the parent mount reach authorize + handlers.
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

async function assertEditable(projectId: string, stageNo: number) {
  const stage = await ProjectStages.get(projectId, stageNo);
  if (!stage) return { error: { status: 404, message: 'Project stage not found' } };
  if (!stage.in_scope || stage.state === 'complete') {
    return {
      error: { status: 400, message: 'Checklist items can only be changed while the stage is in scope and not complete' },
    };
  }
  return { error: null };
}

router.get('/', canView, async (req, res) => {
  const params = stageChecklistProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, stageNo } = params.value as { projectId: string; stageNo: number };

  try {
    const items = await ProjectStageChecklistItems.list(projectId, stageNo);
    res.status(200).json({ status: 'success', data: { items }, message: 'Stage checklist retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.post('/', canManage, async (req, res) => {
  const params = stageChecklistProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = createStageChecklistItemSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId, stageNo } = params.value as { projectId: string; stageNo: number };
  const { text } = body.value as CreateStageChecklistItemBody;

  try {
    const { error } = await assertEditable(projectId, stageNo);
    if (error) {
      res.status(error.status).json({ status: 'error', data: null, message: error.message });
      return;
    }

    const item = await ProjectStageChecklistItems.create({ projectId, stageNo, text, actorId: req.user!.userId });
    res.status(201).json({ status: 'success', data: { item }, message: 'Checklist item added' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.patch('/:itemId', canManage, async (req, res) => {
  const params = stageChecklistItemParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = updateStageChecklistItemSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId, stageNo, itemId } = params.value as { projectId: string; stageNo: number; itemId: string };
  const patch = body.value as UpdateStageChecklistItemBody;

  try {
    const { error } = await assertEditable(projectId, stageNo);
    if (error) {
      res.status(error.status).json({ status: 'error', data: null, message: error.message });
      return;
    }

    const item = await ProjectStageChecklistItems.update(itemId, projectId, stageNo, patch, req.user!.userId);
    if (!item) {
      res.status(404).json({ status: 'error', data: null, message: 'Checklist item not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { item }, message: 'Checklist item updated' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.delete('/:itemId', canManage, async (req, res) => {
  const params = stageChecklistItemParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, stageNo, itemId } = params.value as { projectId: string; stageNo: number; itemId: string };

  try {
    const { error } = await assertEditable(projectId, stageNo);
    if (error) {
      res.status(error.status).json({ status: 'error', data: null, message: error.message });
      return;
    }

    const item = await ProjectStageChecklistItems.delete(itemId, projectId, stageNo);
    if (!item) {
      res.status(404).json({ status: 'error', data: null, message: 'Checklist item not found' });
      return;
    }

    res.status(200).json({ status: 'success', data: { item }, message: 'Checklist item removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

router.delete('/', canManage, async (req, res) => {
  const params = stageChecklistProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, stageNo } = params.value as { projectId: string; stageNo: number };

  try {
    const { error } = await assertEditable(projectId, stageNo);
    if (error) {
      res.status(error.status).json({ status: 'error', data: null, message: error.message });
      return;
    }

    await ProjectStageChecklistItems.deleteAll(projectId, stageNo);
    res.status(200).json({ status: 'success', data: null, message: 'Checklist removed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
