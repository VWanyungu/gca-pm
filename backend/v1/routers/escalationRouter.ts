import express from 'express';
import {
  Escalations,
  WeeklySubmissions,
  Projects,
  type EscalationStatus,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  escalationProjectParamsSchema,
  escalationParamsSchema,
  createEscalationSchema,
  updateEscalationSchema,
  acknowledgeEscalationSchema,
  resolveEscalationSchema,
  createEscalationResponseSchema,
  listEscalationsQuerySchema,
  type CreateEscalationBody,
  type UpdateEscalationBody,
  type AcknowledgeEscalationBody,
  type ResolveEscalationBody,
  type CreateEscalationResponseBody,
  type ListEscalationsQuery,
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

// AC-ESC-02 & AC-ESC-03: Only ExCo (and Admin) may acknowledge and resolve
const canExCo = authorize([
  { role: 'ExCo', scopeType: 'global' },
  { role: 'Admin', scopeType: 'global' },
]);

// AC-ESC-04: ExCo users and the project's PM (plus Admin) may post comments
const canRespond = authorize([
  { role: 'PM', scopeType: 'project' },
  { role: 'ExCo', scopeType: 'global' },
  { role: 'Admin', scopeType: 'global' },
]);

// POST / (create escalation)
router.post('/', canManage, async (req, res) => {
  const params = escalationProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId?: string };

  const body = createEscalationSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const input = body.value as CreateEscalationBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const submission = await WeeklySubmissions.getById(input.submission_id);
    if (!submission) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }

    const targetProjectId = projectId ?? submission.project_id;
    if (submission.project_id !== targetProjectId) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Weekly submission does not belong to this project',
      });
      return;
    }

    const existing = await Escalations.getBySubmissionId(input.submission_id);
    if (existing) {
      res.status(409).json({
        status: 'error',
        data: existing,
        message: 'An escalation already exists for this submission',
      });
      return;
    }

    const created = await Escalations.create({
      submission_id: input.submission_id,
      project_id: targetProjectId,
      status: input.status ?? 'open',
    });

    if (input.note && input.note.trim()) {
      await Escalations.addResponse({
        escalation_id: created.escalation_id,
        author_id: req.user!.userId,
        body: input.note.trim(),
        is_acknowledgement: false,
      });
    }

    const full = await Escalations.getById(created.escalation_id, targetProjectId);
    res.status(201).json({
      status: 'success',
      data: { escalation: full ?? created },
      message: 'Escalation created',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET / (list escalations)
router.get('/', canView, async (req, res) => {
  const params = escalationProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId?: string };

  const query = listEscalationsQuerySchema.validate(req.query, { abortEarly: false });
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }

  const { status, page, limit } = query.value as ListEscalationsQuery;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await Escalations.list({
      projectId,
      status: status as EscalationStatus | undefined,
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Escalations retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /:escalationId (get escalation by ID)
router.get('/:escalationId', canView, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const escalation = await Escalations.getById(escalationId, projectId);
    if (!escalation) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    const responses = await Escalations.getResponses(escalationId);

    res.status(200).json({
      status: 'success',
      data: { escalation, responses },
      message: 'Escalation retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /:escalationId/acknowledge (AC-ESC-02: ExCo only)
router.post('/:escalationId/acknowledge', canExCo, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  const body = acknowledgeEscalationSchema.validate(req.body ?? {}, { abortEarly: false });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const { note } = body.value as AcknowledgeEscalationBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await Escalations.acknowledge({
      escalationId,
      projectId,
      userId: req.user!.userId,
      note,
    });

    if (result.alreadyAcknowledged) {
      res.status(409).json({
        status: 'error',
        data: result.current,
        message: `Already acknowledged by ${result.current?.acknowledged_by_name ?? 'another user'}`,
      });
      return;
    }

    if (!result.escalation) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    const full = await Escalations.getById(escalationId, projectId);
    res.status(200).json({
      status: 'success',
      data: { escalation: full ?? result.escalation, response: result.response },
      message: 'Escalation acknowledged',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /:escalationId/resolve (AC-ESC-03: ExCo only)
router.post('/:escalationId/resolve', canExCo, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  const body = resolveEscalationSchema.validate(req.body ?? {}, { abortEarly: false });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const { note } = body.value as ResolveEscalationBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const existing = await Escalations.getById(escalationId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    if (existing.status === 'resolved') {
      res.status(400).json({ status: 'error', data: null, message: 'Escalation is already resolved' });
      return;
    }

    if (existing.status === 'voided') {
      res.status(400).json({ status: 'error', data: null, message: 'Cannot resolve a voided escalation' });
      return;
    }

    const result = await Escalations.resolve({
      escalationId,
      projectId,
      userId: req.user!.userId,
      note,
    });

    const full = await Escalations.getById(escalationId, projectId);
    res.status(200).json({
      status: 'success',
      data: { escalation: full ?? result.escalation, response: result.response },
      message: 'Escalation resolved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /:escalationId/responses (AC-ESC-04: ExCo or PM comment)
router.post('/:escalationId/responses', canRespond, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  const body = createEscalationResponseSchema.validate(req.body, { abortEarly: false });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const input = body.value as CreateEscalationResponseBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const existing = await Escalations.getById(escalationId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    const created = await Escalations.addResponse({
      escalation_id: escalationId,
      author_id: req.user!.userId,
      body: input.body,
      is_acknowledgement: input.is_acknowledgement ?? false,
    });

    res.status(201).json({
      status: 'success',
      data: { response: created },
      message: 'Response added',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /:escalationId/responses (list thread responses)
router.get('/:escalationId/responses', canView, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const existing = await Escalations.getById(escalationId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    const responses = await Escalations.getResponses(escalationId);
    res.status(200).json({
      status: 'success',
      data: { responses },
      message: 'Responses retrieved',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// PATCH /:escalationId (update status / fields)
router.patch('/:escalationId', canManage, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  const body = updateEscalationSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const patch = body.value as UpdateEscalationBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const existing = await Escalations.getById(escalationId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    const isExCoOrAdmin = req.user?.role?.some(
      (r) => (r.role === 'Admin' || r.role === 'ExCo') && r.scope_type === 'global',
    );

    const updates: Record<string, unknown> = {};

    if (patch.status && patch.status !== existing.status) {
      // AC-ESC-02 & AC-ESC-03: Only ExCo / Admin can acknowledge or resolve
      if ((patch.status === 'acknowledged' || patch.status === 'resolved') && !isExCoOrAdmin) {
        res.status(403).json({
          status: 'error',
          data: null,
          message: 'Only ExCo or Admin can acknowledge or resolve escalations',
        });
        return;
      }

      updates.status = patch.status;
      if (patch.status === 'acknowledged') {
        updates.acknowledged_by = req.user!.userId;
        updates.acknowledged_at = new Date();
      } else if (patch.status === 'resolved') {
        updates.resolved_by = req.user!.userId;
        updates.resolved_at = new Date();
        if (!existing.acknowledged_by) {
          updates.acknowledged_by = req.user!.userId;
          updates.acknowledged_at = new Date();
        }
      } else if (patch.status === 'open') {
        // Reopen clears acknowledgements and resolutions
        updates.acknowledged_by = null;
        updates.acknowledged_at = null;
        updates.resolved_by = null;
        updates.resolved_at = null;
      }
    }

    const updated = await Escalations.update(escalationId, updates, projectId);

    if (patch.note && patch.note.trim()) {
      await Escalations.addResponse({
        escalation_id: escalationId,
        author_id: req.user!.userId,
        body: patch.note.trim(),
        is_acknowledgement: patch.status === 'acknowledged',
      });
    }

    const full = await Escalations.getById(escalationId, projectId);
    res.status(200).json({
      status: 'success',
      data: { escalation: full ?? updated },
      message: 'Escalation updated',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// DELETE /:escalationId (delete escalation and responses)
router.delete('/:escalationId', canManage, async (req, res) => {
  const params = escalationParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, escalationId } = params.value as { projectId?: string; escalationId: string };

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const existing = await Escalations.getById(escalationId, projectId);
    if (!existing) {
      res.status(404).json({ status: 'error', data: null, message: 'Escalation not found' });
      return;
    }

    const deleted = await Escalations.delete(escalationId, projectId);
    res.status(200).json({
      status: 'success',
      data: { escalation: deleted },
      message: 'Escalation deleted',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
