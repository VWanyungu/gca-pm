import express from 'express';
import {
  WeeklySubmissions,
  Projects,
  type WeeklySubmissionStatus,
  type ProjectRag,
} from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import {
  weeklySubmissionProjectParamsSchema,
  weeklySubmissionParamsSchema,
  weeklySubmissionAddressedRiskParamsSchema,
  createWeeklySubmissionSchema,
  updateWeeklySubmissionSchema,
  approveWeeklySubmissionSchema,
  supersedeWeeklySubmissionSchema,
  addSubmissionAddressedRiskSchema,
  listWeeklySubmissionsQuerySchema,
  type CreateWeeklySubmissionBody,
  type UpdateWeeklySubmissionBody,
  type ApproveWeeklySubmissionBody,
  type SupersedeWeeklySubmissionBody,
  type AddSubmissionAddressedRiskBody,
  type ListWeeklySubmissionsQuery,
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
  { role: 'Admin', scopeType: 'global' },
]);

const canSupersede = authorize([
  { role: 'Admin', scopeType: 'global' },
]);

// POST / (create weekly submission draft)
router.post('/', canManage, async (req, res) => {
  const params = weeklySubmissionProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId?: string };

  const body = createWeeklySubmissionSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const input = body.value as CreateWeeklySubmissionBody;
  const targetProjectId = projectId ?? req.body.project_id;

  if (!targetProjectId) {
    res.status(400).json({ status: 'error', data: null, message: 'projectId is required' });
    return;
  }

  try {
    const project = await Projects.getById(targetProjectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const created = await WeeklySubmissions.create({
      project_id: targetProjectId,
      week_start: input.week_start,
      active_stages: input.active_stages,
      scope_change_text: input.scope_change_text,
      top_risk_id: input.top_risk_id,
      top_risk_text: input.top_risk_text,
      top_action: input.top_action,
      pm_commentary: input.pm_commentary,
      exco_decision_needed: input.exco_decision_needed,
      escalate: input.escalate,
      escalation_reason: input.escalation_reason,
      created_by: req.user!.userId,
      addressed_risks: input.addressed_risks,
    });

    res.status(201).json({
      status: 'success',
      data: { submission: created },
      message: 'Weekly submission created',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET / (list weekly submissions)
router.get('/', canView, async (req, res) => {
  const params = weeklySubmissionProjectParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId?: string };

  const query = listWeeklySubmissionsQuerySchema.validate(req.query, { abortEarly: false });
  if (query.error) {
    res.status(400).json({ status: 'error', data: null, message: query.error.message });
    return;
  }

  const { status, week_start, page, limit } = query.value as ListWeeklySubmissionsQuery;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await WeeklySubmissions.list({
      projectId,
      status: status as WeeklySubmissionStatus | undefined,
      week_start,
      page,
      limit,
    });

    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Weekly submissions retrieved',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// GET /:submissionId (get weekly submission by ID)
router.get('/:submissionId', canView, async (req, res) => {
  const params = weeklySubmissionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId } = params.value as { projectId?: string; submissionId: string };

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const submission = await WeeklySubmissions.getById(submissionId, projectId);
    if (!submission) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { submission },
      message: 'Weekly submission retrieved',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// PATCH /:submissionId (update weekly submission draft)
router.patch('/:submissionId', canManage, async (req, res) => {
  const params = weeklySubmissionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId } = params.value as { projectId?: string; submissionId: string };

  const body = updateWeeklySubmissionSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const patch = body.value as UpdateWeeklySubmissionBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await WeeklySubmissions.update(
      submissionId,
      patch,
      req.user!.userId,
      projectId,
    );

    if (result.notFound) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }
    if (result.readOnly) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Approved submissions are read-only — ask an Admin to supersede',
      });
      return;
    }
    if (result.concurrencyError) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: 'Conflict: Submission was updated by another user or tab. Please reload.',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { submission: result.submission },
      message: 'Weekly submission updated',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// DELETE /:submissionId (delete weekly submission draft)
router.delete('/:submissionId', canManage, async (req, res) => {
  const params = weeklySubmissionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId } = params.value as { projectId?: string; submissionId: string };

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await WeeklySubmissions.delete(submissionId, projectId);
    if (result.notFound) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }
    if (result.readOnly) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Only draft weekly submissions can be deleted',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Weekly submission deleted',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /:submissionId/approve (AC-WKS-04 & AC-WKS-05: approve submission)
router.post('/:submissionId/approve', canManage, async (req, res) => {
  const params = weeklySubmissionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId } = params.value as { projectId?: string; submissionId: string };

  const body = approveWeeklySubmissionSchema.validate(req.body ?? {}, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const input = body.value as ApproveWeeklySubmissionBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await WeeklySubmissions.approve(
      submissionId,
      {
        approved_by: req.user!.userId,
        updated_at: input.updated_at,
        planned_pct: input.planned_pct,
        actual_pct: input.actual_pct,
        spi: input.spi,
        rag: input.rag as ProjectRag | undefined,
        schedule_version_id: input.schedule_version_id,
      },
      projectId,
    );

    if (result.notFound) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }
    if (result.alreadyApproved) {
      res.status(400).json({ status: 'error', data: null, message: 'Submission is already approved' });
      return;
    }
    if (result.concurrencyError) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: 'Conflict: Submission was updated by another user or tab. Please reload.',
      });
      return;
    }
    if (result.validationErrors && result.validationErrors.length > 0) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: result.validationErrors.join('; '),
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: { submission: result.submission },
      message: 'Weekly submission approved',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /:submissionId/supersede (AC-WKS-07: Admin authorises supersede)
router.post('/:submissionId/supersede', canSupersede, async (req, res) => {
  const params = weeklySubmissionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId } = params.value as { projectId?: string; submissionId: string };

  const body = supersedeWeeklySubmissionSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const input = body.value as SupersedeWeeklySubmissionBody;

  try {
    if (projectId) {
      const project = await Projects.getById(projectId);
      if (!project) {
        res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
        return;
      }
    }

    const result = await WeeklySubmissions.supersede(
      submissionId,
      {
        supersede_reason: input.supersede_reason,
        authorised_by: req.user!.userId,
      },
      projectId,
    );

    if (result.notFound) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }
    if (result.notApproved) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Only approved weekly submissions can be superseded',
      });
      return;
    }
    if (result.draftAlreadyExists) {
      res.status(409).json({
        status: 'error',
        data: null,
        message: 'A draft already exists for this project-week',
      });
      return;
    }

    res.status(201).json({
      status: 'success',
      data: { submission: result.newDraft },
      message: 'Weekly submission superseded; new draft created',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// POST /:submissionId/addressed-risks (AC-WKS-03: Add addressed risk while drafting)
router.post('/:submissionId/addressed-risks', canManage, async (req, res) => {
  const params = weeklySubmissionParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId } = params.value as { projectId?: string; submissionId: string };

  const body = addSubmissionAddressedRiskSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }

  const input = body.value as AddSubmissionAddressedRiskBody;

  try {
    const result = await WeeklySubmissions.addAddressedRisk(submissionId, {
      risk_id: input.risk_id,
      method: input.method,
      dismissal_reason: input.dismissal_reason,
      userId: req.user!.userId,
      projectId,
    });

    if (result.notFound) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }
    if (result.readOnly) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Approved submissions are read-only — ask an Admin to supersede',
      });
      return;
    }
    if (result.riskNotFound) {
      res.status(404).json({
        status: 'error',
        data: null,
        message: 'Open risk belonging to this project not found',
      });
      return;
    }

    res.status(201).json({
      status: 'success',
      data: { addressedRisk: result.addressedRisk },
      message: 'Addressed risk added',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

// DELETE /:submissionId/addressed-risks/:riskId (Remove addressed risk while drafting)
router.delete('/:submissionId/addressed-risks/:riskId', canManage, async (req, res) => {
  const params = weeklySubmissionAddressedRiskParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, submissionId, riskId } = params.value as {
    projectId?: string;
    submissionId: string;
    riskId: string;
  };

  try {
    const result = await WeeklySubmissions.removeAddressedRisk(submissionId, riskId, projectId);

    if (result.notFound) {
      res.status(404).json({ status: 'error', data: null, message: 'Weekly submission not found' });
      return;
    }
    if (result.readOnly) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Approved submissions are read-only — ask an Admin to supersede',
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      data: null,
      message: 'Addressed risk removed',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ status: 'error', data: null, message });
  }
});

export default router;
