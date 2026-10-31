import { describe, expect, it, mock } from 'bun:test';
import { sendRouteError } from '../utils/errors.js';

function fakeRes() {
  const calls: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) {
      calls.status = code;
      return res;
    },
    json(body: unknown) {
      calls.body = body;
    },
  };
  return { res: res as any, calls };
}

describe('sendRouteError', () => {
  it('translates a known pg SQLSTATE into a friendly message, never the raw driver text', () => {
    const { res, calls } = fakeRes();
    sendRouteError(res, { code: '23505', detail: 'Key (email)=(a@b.com) already exists.' });
    expect(calls.status).toBe(409);
    expect((calls.body as { message: string }).message).not.toContain('Key (email)');
  });

  it('falls back to a generic message for an unmapped pg SQLSTATE', () => {
    const { res, calls } = fakeRes();
    sendRouteError(res, { code: '55P03', message: 'lock not available' });
    expect(calls.status).toBe(500);
    expect((calls.body as { message: string }).message).not.toContain('lock not available');
  });

  it('passes through a deliberate app-thrown Error as-is', () => {
    const { res, calls } = fakeRes();
    sendRouteError(res, new Error('DPR has already been submitted'));
    expect(calls.status).toBe(500);
    expect((calls.body as { message: string }).message).toBe('DPR has already been submitted');
  });

  it('hides an unexpected runtime error (e.g. a bug) behind a generic message', () => {
    const { res, calls } = fakeRes();
    sendRouteError(res, new TypeError("Cannot read properties of undefined (reading 'foo')"));
    expect(calls.status).toBe(500);
    expect((calls.body as { message: string }).message).not.toContain('Cannot read properties');
  });

  it('always logs the real error server-side', () => {
    const spy = mock(() => {});
    const original = console.error;
    console.error = spy;
    try {
      sendRouteError(fakeRes().res, { code: '23505' });
      expect(spy).toHaveBeenCalled();
    } finally {
      console.error = original;
    }
  });
});
