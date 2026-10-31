import type { Response } from 'express';

interface PgError {
  code: string;
  status: number;
  message: string;
}

/** Postgres SQLSTATE codes we know how to translate into a message a user can act on. */
const PG_ERROR_BY_CODE: Record<string, { status: number; message: string }> = {
  '23505': { status: 409, message: 'This already exists. Check for a duplicate and try again.' },
  '23503': {
    status: 409,
    message: "This can't be completed because other records still depend on it.",
  },
  '23502': { status: 400, message: 'A required field is missing. Please fill in all required fields.' },
  '22P02': { status: 400, message: 'One of the values provided is the wrong type. Please check your input.' },
  '23514': { status: 400, message: 'One of the values provided is not allowed. Please check your input.' },
};

function isPgError(err: unknown): err is PgError {
  return typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string';
}

const FALLBACK_MESSAGE = 'Something went wrong on our end. Please try again, and contact support if it continues.';

/**
 * AC-GEN-11: never surface raw database errors to the client. Used in place of
 * `res.status(500).json({ ..., message: err.message })` in route catch blocks.
 *
 * Deliberate domain errors (plain `throw new Error('...')`, e.g. "DPR has already been
 * submitted") carry no pg `.code` and are already written to be user-facing, so they pass
 * through as-is. Anything with a pg SQLSTATE `.code` is a raw driver/constraint error and
 * gets translated; anything else unexpected (TypeError, etc.) falls back to a generic message.
 */
export function sendRouteError(res: Response, err: unknown): void {
  console.error(err);

  if (isPgError(err)) {
    const known = PG_ERROR_BY_CODE[err.code];
    if (known) {
      res.status(known.status).json({ status: 'error', data: null, message: known.message });
      return;
    }
    res.status(500).json({ status: 'error', data: null, message: FALLBACK_MESSAGE });
    return;
  }

  const message = err instanceof Error && err.constructor === Error ? err.message : FALLBACK_MESSAGE;
  res.status(500).json({ status: 'error', data: null, message });
}
