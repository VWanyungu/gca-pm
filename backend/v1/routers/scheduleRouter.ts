import express from 'express';
import {
  Projects,
  ScheduleVersions,
  ScheduleTasks,
  ScheduleReconciliationFlags,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  scheduleProjectParamsSchema,
  scheduleVersionParamsSchema,
  listReconciliationFlagsQuerySchema,
  acknowledgeReconciliationFlagsSchema,
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
  { role: 'Planner', scopeType: 'project' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'Admin', scopeType: 'global' },
]);

// GET /projects/:projectId/schedule/versions
router.get('/versions', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const versions = await ScheduleVersions.listApplied(projectId);
    res.status(200).json({ status: 'success', data: { versions }, message: 'Schedule versions retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/versions/:versionId/changes
router.get('/versions/:versionId/changes', canView, async (req, res) => {
  const params = scheduleVersionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, versionId } = params.value as { projectId: string; versionId: string };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const changes = await ScheduleVersions.getChanges(projectId, versionId);
    res.status(200).json({ status: 'success', data: { changes }, message: 'Version changes retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/tasks
router.get('/tasks', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const tasks = await ScheduleTasks.listCurrent(projectId);
    res.status(200).json({ status: 'success', data: { tasks }, message: 'Schedule tasks retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/overdue
router.get('/overdue', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const tasks = await ScheduleTasks.listOverdue(projectId);
    res.status(200).json({ status: 'success', data: { tasks }, message: 'Overdue tasks retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /projects/:projectId/schedule/reconciliation-flags
router.get('/reconciliation-flags', canView, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const query = listReconciliationFlagsQuerySchema.validate(req.query, { abortEarly: false });
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const filter = query.value as { includeAcknowledged: boolean; page: number; limit: number };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const result = await ScheduleReconciliationFlags.list({
      projectId,
      includeAcknowledged: filter.includeAcknowledged,
      page: filter.page,
      limit: filter.limit,
    });

    res.status(200).json({ status: 'success', data: result, message: 'Reconciliation flags retrieved' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /projects/:projectId/schedule/reconciliation-flags/acknowledge
router.post('/reconciliation-flags/acknowledge', canManage, async (req, res) => {
  const params = scheduleProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = acknowledgeReconciliationFlagsSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const { flag_ids } = body.value as { flag_ids: string[] };

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const acknowledged = await ScheduleReconciliationFlags.acknowledge(projectId, flag_ids, req.user!.userId);
    res.status(200).json({ status: 'success', data: { acknowledged }, message: 'Flags acknowledged' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
