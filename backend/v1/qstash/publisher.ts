import { qstashClient, QSTASH_WEBHOOK_URL, QSTASH_TOKEN } from './client.js';
import type { QStashEventEnvelope } from './types.js';

export interface PublishOptions {
  url?: string;
  delaySeconds?: number;
  retries?: number;
}

/**
 * Publishes an event envelope to Upstash QStash.
 * QStash will buffer and asynchronously deliver the event to the target handler URL.
 */
export async function publishToQStash(
  envelope: QStashEventEnvelope,
  options: PublishOptions = {},
): Promise<{ messageId: string }> {
  const targetUrl = options.url || QSTASH_WEBHOOK_URL;

  if (!QSTASH_TOKEN) {
    throw new Error('QSTASH_TOKEN is not configured in environment');
  }

  const response: any = await qstashClient.publishJSON({
    url: targetUrl,
    body: envelope,
    deduplicationId: envelope.event_id,
    retries: options.retries ?? 3,
    delay: options.delaySeconds,
    headers: {
      'x-correlation-id': envelope.event_id,
      'x-event-type': envelope.event_type,
    },
  });

  return { messageId: response?.messageId || response?.[0]?.messageId || 'queued' };
}
