import { describe, expect, it } from 'bun:test';
import qstashRouter from '../qstash/router.js';
import { verifyQStashSignature } from '../qstash/verifySignature.js';
import { verifyWebhookSecret } from '../qstash/verifyWebhookSecret.js';
import { dispatchQStashEvent } from '../qstash/handlers/index.js';

function createMockRes() {
  const result = {
    statusCode: 200,
    body: null as any,
    status(code: number) {
      result.statusCode = code;
      return result;
    },
    json(data: any) {
      result.body = data;
      return result;
    },
  };
  return result;
}

function findRoute(path: string) {
  const route = (qstashRouter.stack || []).find(
    (layer: any) => layer.route && layer.route.path === path && layer.route.methods.post,
  );
  return (route as any).route;
}

/** Runs a route's full middleware stack in order, like Express would. */
async function runRoute(path: string, req: any) {
  const handlers = findRoute(path).stack.map((layer: any) => layer.handle);
  const res = createMockRes();
  let i = 0;
  const next = async () => {
    i += 1;
    if (i < handlers.length) await handlers[i](req, res, next);
  };
  await handlers[0](req, res, next);
  return res;
}

describe('QStash Integration', () => {
  it('exports a valid Express router', () => {
    expect(qstashRouter).toBeDefined();
    expect(typeof qstashRouter).toBe('function');
  });

  it('has a /webhook route guarded by verifyWebhookSecret ahead of the handler', () => {
    const stack = findRoute('/webhook').stack;
    expect(stack.length).toBe(2);
    expect(stack[0].handle).toBe(verifyWebhookSecret);
  });

  it('rejects inbound webhook without event_type', async () => {
    const req: any = { headers: {}, body: { project: { project_code: '001-001.2026' } } };
    const res = await runRoute('/webhook', req);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Missing event_type');
  });

  it('rejects inbound webhook without project identifier', async () => {
    const req: any = { headers: {}, body: { event_type: 'dpr.sync', project: {} } };
    const res = await runRoute('/webhook', req);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Missing project.project_code');
  });

  describe('verifyWebhookSecret', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.SISTER_WEBHOOK_SECRET;

    function restore() {
      process.env.NODE_ENV = originalEnv;
      process.env.SISTER_WEBHOOK_SECRET = originalSecret;
    }

    it('rejects a missing/incorrect header when a secret is configured, even in production', async () => {
      try {
        process.env.NODE_ENV = 'production';
        process.env.SISTER_WEBHOOK_SECRET = 'correct-secret';

        const req: any = { headers: {} };
        const res = createMockRes();
        let nextCalled = false;
        await verifyWebhookSecret(req, res as any, () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(401);

        const reqWrong: any = { headers: { 'x-webhook-secret': 'wrong' } };
        const resWrong = createMockRes();
        await verifyWebhookSecret(reqWrong, resWrong as any, () => {});
        expect(resWrong.statusCode).toBe(401);
      } finally {
        restore();
      }
    });

    it('accepts the correct shared-secret header', async () => {
      try {
        process.env.NODE_ENV = 'production';
        process.env.SISTER_WEBHOOK_SECRET = 'correct-secret';

        const req: any = { headers: { 'x-webhook-secret': 'correct-secret' } };
        const res = createMockRes();
        let nextCalled = false;
        await verifyWebhookSecret(req, res as any, () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(true);
      } finally {
        restore();
      }
    });

    it('refuses to bypass in production when no secret is configured', async () => {
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.SISTER_WEBHOOK_SECRET;

        const req: any = { headers: {} };
        const res = createMockRes();
        let nextCalled = false;
        await verifyWebhookSecret(req, res as any, () => {
          nextCalled = true;
        });

        expect(nextCalled).toBe(false);
        expect(res.statusCode).toBe(500);
      } finally {
        restore();
      }
    });
  });

  it('hides /sync-direct outside of production-only development use', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const req: any = { headers: {}, body: {} };
      const res = await runRoute('/sync-direct', req);
      expect(res.statusCode).toBe(404);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('verifies signature middleware handles missing signature in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.QSTASH_CURRENT_SIGNING_KEY;

    try {
      process.env.NODE_ENV = 'production';
      const req: any = { headers: {} };
      const res = createMockRes();
      let nextCalled = false;

      await verifyQStashSignature(req, res as any, () => {
        nextCalled = true;
      });

      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.QSTASH_CURRENT_SIGNING_KEY = originalKey;
    }
  });

  it('throws an error for completely unsupported event types', async () => {
    const envelope: any = {
      event_id: 'test-123',
      event_type: 'unknown.type',
      project: { project_code: '001-001.2026' },
      data: {},
    };

    expect(dispatchQStashEvent(envelope)).rejects.toThrow('Unsupported QStash event type: unknown.type');
  });
});
