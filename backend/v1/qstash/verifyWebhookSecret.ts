import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

/**
 * Middleware to verify the sister system's webhook calls.
 * The sister project cannot sign requests, so this is a shared secret sent as
 * the `x-webhook-secret` header, compared with a constant-time check.
 */
export function verifyWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.SISTER_WEBHOOK_SECRET || '';

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[QStash] SISTER_WEBHOOK_SECRET is not set. Bypassing webhook auth in non-production mode.');
      next();
      return;
    }
    res.status(500).json({ status: 'error', data: null, message: 'Webhook secret is not configured on server.' });
    return;
  }

  const provided = req.headers['x-webhook-secret'];
  const expected = Buffer.from(secret);
  const actual = Buffer.from(typeof provided === 'string' ? provided : '');

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    res.status(401).json({ status: 'error', data: null, message: 'Missing or invalid x-webhook-secret header.' });
    return;
  }

  next();
}
