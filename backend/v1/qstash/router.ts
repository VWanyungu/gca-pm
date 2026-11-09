import express, { type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { verifyQStashSignature, type QStashRequest } from './verifySignature.js';
import { verifyWebhookSecret } from './verifyWebhookSecret.js';
import { publishToQStash } from './publisher.js';
import { dispatchQStashEvent } from './handlers/index.js';
import type { QStashEventEnvelope } from './types.js';
import { QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_WEBHOOK_URL } from './client.js';

const router = express.Router();

/**
 * GET /health
 * Status check for QStash configuration.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    data: {
      hasToken: Boolean(QSTASH_TOKEN),
      hasSigningKey: Boolean(QSTASH_CURRENT_SIGNING_KEY),
      webhookUrl: QSTASH_WEBHOOK_URL,
    },
    message: 'QStash router is active',
  });
});

/**
 * POST /webhook (or POST /inbound)
 * Ingestion endpoint hit by the sister system.
 * Validates the event, enqueues it to Upstash QStash, and immediately returns 202 Accepted.
 */
router.post('/webhook', verifyWebhookSecret, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<QStashEventEnvelope>;

    if (!body || !body.event_type) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Missing event_type in payload',
      });
      return;
    }

    if (!body.project?.project_code && !body.project?.project_id) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Missing project.project_code or project.project_id',
      });
      return;
    }

    const envelope: QStashEventEnvelope = {
      event_id: body.event_id || randomUUID(),
      event_type: body.event_type,
      timestamp: body.timestamp || new Date().toISOString(),
      source_system: body.source_system || 'sister_system',
      project: body.project,
      data: body.data ?? {},
    };

    // If QStash token is configured, publish to QStash queue
    if (QSTASH_TOKEN) {
      const { messageId } = await publishToQStash(envelope);
      res.status(202).json({
        status: 'accepted',
        message: 'Event successfully queued to QStash for asynchronous processing',
        correlation_id: envelope.event_id,
        qstash_message_id: messageId,
      });
      return;
    }

    // Direct, synchronous dispatch skips QStash's own signature verification, so it's
    // restricted to non-production environments only.
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({
        status: 'error',
        data: null,
        message: 'QSTASH_TOKEN is not configured; direct processing is disabled in production.',
      });
      return;
    }

    console.warn('[QStash] QSTASH_TOKEN missing, processing event directly as dev fallback');
    const result = await dispatchQStashEvent(envelope);
    res.status(200).json({
      status: 'success',
      message: 'Processed synchronously (fallback mode)',
      correlation_id: envelope.event_id,
      data: result,
    });
  } catch (err: any) {
    console.error('[QStash Webhook] Ingestion error:', err);
    res.status(500).json({
      status: 'error',
      data: null,
      message: err?.message || 'Failed to process webhook',
    });
  }
});

/**
 * POST /handler
 * Consumer endpoint called by Upstash QStash via HTTP push.
 * Verifies the Upstash cryptographic signature and updates the GCA database.
 */
router.post('/handler', verifyQStashSignature, async (req: QStashRequest, res: Response): Promise<void> => {
  try {
    const envelope = req.body as QStashEventEnvelope;

    if (!envelope || !envelope.event_type) {
      res.status(400).json({
        status: 'error',
        data: null,
        message: 'Invalid QStash payload: missing event_type',
      });
      return;
    }

    const result = await dispatchQStashEvent(envelope);

    res.status(200).json({
      status: 'success',
      data: result,
      correlation_id: envelope.event_id,
      message: `Successfully processed ${envelope.event_type}`,
    });
  } catch (err: any) {
    console.error('[QStash Handler] Execution error:', err);
    // Returning 500 signals QStash to retry according to retry policy
    res.status(500).json({
      status: 'error',
      data: null,
      message: err?.message || 'Error processing QStash event',
    });
  }
});

/**
 * POST /sync-direct
 * For testing and synchronous direct execution without queuing.
 * Development environments only — bypasses both QStash's signature check and the
 * shared-secret check on /webhook, so it must never be reachable in production.
 */
router.post('/sync-direct', async (req: Request, res: Response): Promise<void> => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ status: 'error', data: null, message: 'Not found' });
    return;
  }
  try {
    const envelope = req.body as QStashEventEnvelope;
    if (!envelope.event_id) envelope.event_id = randomUUID();

    const result = await dispatchQStashEvent(envelope);
    res.status(200).json({
      status: 'success',
      data: result,
      correlation_id: envelope.event_id,
    });
  } catch (err: any) {
    res.status(400).json({
      status: 'error',
      data: null,
      message: err?.message || 'Sync failed',
    });
  }
});

export default router;

