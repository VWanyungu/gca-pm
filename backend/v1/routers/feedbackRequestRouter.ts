import express from 'express';
import { ClientFeedbackRequests, Projects, feedbackRequestStatus } from '../database/utils/database.js';
import authorize from '../middlewares/authorize.js';
import requireKickoffComplete from '../middlewares/requireKickoffComplete.js';
import { sendRouteError } from '../utils/errors.js';
import {
  projectIdParamSchema,
  createFeedbackRequestsSchema,
  feedbackRequestParamsSchema,
  type CreateFeedbackRequestsBody,
} from '../utils/validation.js';

// mergeParams so :projectId reaches authorize + handlers.
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

// GET /projects/:projectId/feedback-requests
router.get('/', canView, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };

  try {
    const rows = await ClientFeedbackRequests.listByProjectId(projectId);
    const requests = rows.map((row) => ({ ...row, status: feedbackRequestStatus(row) }));
    const summary = ClientFeedbackRequests.ratingSummary(rows);
    res.status(200).json({
      status: 'success',
      data: { requests, summary },
      message: 'Client feedback requests retrieved',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// POST /projects/:projectId/feedback-requests
router.post('/', requireKickoffComplete(), canManage, async (req, res) => {
  const params = projectIdParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = createFeedbackRequestsSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { projectId } = params.value as { projectId: string };
  const input = body.value as CreateFeedbackRequestsBody;

  try {
    const project = await Projects.getById(projectId);
    if (!project) {
      res.status(404).json({ status: 'error', data: null, message: 'Project not found' });
      return;
    }

    const currentStage = (await Projects.currentStageByProjectId([projectId])).get(projectId);
    const about = currentStage?.stage_name ?? 'Whole project';

    const requests = await ClientFeedbackRequests.create({
      project_id: projectId,
      contact_ids: input.contact_ids,
      requested_by: req.user!.userId,
      about,
      expires_in_days: input.expires_in_days,
    });

    res.status(201).json({
      status: 'success',
      data: { requests: requests.map((row) => ({ ...row, status: feedbackRequestStatus(row) })) },
      message: 'Feedback requested',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// DELETE /projects/:projectId/feedback-requests/:requestId
// Only a request that hasn't been opened yet can be withdrawn — once the client has seen
// (or answered) the link, pulling it out from under them would be confusing.
router.delete('/:requestId', canManage, async (req, res) => {
  const params = feedbackRequestParamsSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { projectId, requestId } = params.value as { projectId: string; requestId: string };

  try {
    const request = await ClientFeedbackRequests.getById(projectId, requestId);
    if (!request) {
      res.status(404).json({ status: 'error', data: null, message: 'Feedback request not found' });
      return;
    }
    if (feedbackRequestStatus(request) !== 'sent') {
      res.status(409).json({
        status: 'error',
        data: null,
        message: 'Only a request that has not been opened yet can be deleted',
      });
      return;
    }

    await ClientFeedbackRequests.delete(requestId);
    res.status(200).json({ status: 'success', data: null, message: 'Feedback request deleted' });
  } catch (err) {
    sendRouteError(res, err);
  }
});

export default router;
