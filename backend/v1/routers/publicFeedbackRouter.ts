import express from 'express';
import { ClientFeedbackRequests, feedbackRequestStatus } from '../database/utils/database.js';
import { sendRouteError } from '../utils/errors.js';
import {
  feedbackTokenParamSchema,
  submitFeedbackResponseSchema,
  type SubmitFeedbackResponseBody,
} from '../utils/validation.js';

// Unauthenticated: reached directly from the link the client is sent, no login involved.
const router = express.Router();

// GET /feedback/:token
router.get('/:token', async (req, res) => {
  const params = feedbackTokenParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const { token } = params.value as { token: string };

  try {
    const request = await ClientFeedbackRequests.getByToken(token);
    if (!request) {
      res.status(404).json({ status: 'error', data: null, message: 'Feedback link not found' });
      return;
    }

    const status = feedbackRequestStatus(request);
    if (status === 'sent') await ClientFeedbackRequests.markOpened(request.request_id);

    res.status(200).json({
      status: 'success',
      data: {
        status,
        project_name: request.project_name,
        contact_name: request.contact_name,
        about: request.about,
        pm_name: request.pm_name,
        pm_email: request.pm_email,
        ...(status === 'responded'
          ? {
              rating_overall: request.rating_overall,
              rating_quality: request.rating_quality,
              rating_updates: request.rating_updates,
              rating_schedule: request.rating_schedule,
            }
          : {}),
      },
      message: 'Feedback request retrieved',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

// POST /feedback/:token
router.post('/:token', async (req, res) => {
  const params = feedbackTokenParamSchema.validate(req.params);
  if (params.error) {
    res.status(400).json({ status: 'error', data: null, message: params.error.message });
    return;
  }
  const body = submitFeedbackResponseSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (body.error) {
    res.status(400).json({ status: 'error', data: null, message: body.error.message });
    return;
  }
  const { token } = params.value as { token: string };
  const input = body.value as SubmitFeedbackResponseBody;

  try {
    const request = await ClientFeedbackRequests.getByToken(token);
    if (!request) {
      res.status(404).json({ status: 'error', data: null, message: 'Feedback link not found' });
      return;
    }

    const status = feedbackRequestStatus(request);
    if (status === 'responded') {
      res.status(409).json({ status: 'error', data: null, message: 'This link has already been used' });
      return;
    }
    if (status === 'expired') {
      res.status(410).json({ status: 'error', data: null, message: 'This link has expired' });
      return;
    }

    const updated = await ClientFeedbackRequests.submitResponse(request.request_id, input);
    res.status(200).json({
      status: 'success',
      data: {
        contact_name: request.contact_name,
        project_name: request.project_name,
        rating_overall: updated.rating_overall,
        rating_quality: updated.rating_quality,
        rating_updates: updated.rating_updates,
        rating_schedule: updated.rating_schedule,
      },
      message: 'Feedback submitted',
    });
  } catch (err) {
    sendRouteError(res, err);
  }
});

export default router;
