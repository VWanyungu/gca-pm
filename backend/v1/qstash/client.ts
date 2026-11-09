import { Client, Receiver } from '@upstash/qstash';

export const QSTASH_TOKEN = process.env.QSTASH_TOKEN || '';
export const QSTASH_CURRENT_SIGNING_KEY = process.env.QSTASH_CURRENT_SIGNING_KEY || '';
export const QSTASH_NEXT_SIGNING_KEY = process.env.QSTASH_NEXT_SIGNING_KEY || '';
export const QSTASH_WEBHOOK_URL =
  process.env.QSTASH_WEBHOOK_URL ||
  (process.env.APP_URL ? `${process.env.APP_URL}/qstash/handler` : 'http://localhost:3000/qstash/handler');

/**
 * QStash Client for publishing messages to Upstash QStash.
 */
export const qstashClient = new Client({
  token: QSTASH_TOKEN,
});

/**
 * QStash Receiver for verifying Upstash signatures on incoming webhooks.
 */
export const qstashReceiver = new Receiver({
  currentSigningKey: QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: QSTASH_NEXT_SIGNING_KEY,
});

