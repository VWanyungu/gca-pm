import type { Request, Response, NextFunction } from 'express';
import { qstashReceiver, QSTASH_CURRENT_SIGNING_KEY } from './client.js';

export interface QStashRequest extends Request {
  rawBody?: string;
}

/**
 * Middleware to verify that the request came from Upstash QStash.
 * Validates the `upstash-signature` header against the raw body.
 */
export async function verifyQStashSignature(
  req: QStashRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const signature = req.headers['upstash-signature'] as string | undefined;

  // In non-production environments without keys configured, allow bypass with warning for testing
  if (!QSTASH_CURRENT_SIGNING_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[QStash] QSTASH_CURRENT_SIGNING_KEY is not set. Bypassing signature verification in non-production mode.',
      );
      next();
      return;
    }

    res.status(500).json({
      status: 'error',
      data: null,
      message: 'QStash signing keys are not configured on server.',
    });
    return;
  }

  if (!signature) {
    res.status(401).json({
      status: 'error',
      data: null,
      message: 'Missing upstash-signature header.',
    });
    return;
  }

  try {
    const rawBody = req.rawBody ?? JSON.stringify(req.body);
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const isValid = await qstashReceiver.verify({
      signature,
      body: rawBody,
      url,
    });

    if (!isValid) {
      res.status(401).json({
        status: 'error',
        data: null,
        message: 'Invalid QStash signature.',
      });
      return;
    }

    next();
  } catch (err: any) {
    console.error('[QStash] Signature verification error:', err);
    res.status(401).json({
      status: 'error',
      data: null,
      message: err?.message || 'QStash signature verification failed.',
    });
  }
}

