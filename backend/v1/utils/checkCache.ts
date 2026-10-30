import { Cache } from '../database/utils/cache.js';
import { Tokens, Users } from '../database/utils/database.js';

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const cached = await Cache.get<boolean>(`blacklist_${token}`);
  if (cached !== null) return cached === true;

  const blacklisted = await Tokens.checkBlacklistToken(token);
  await Cache.set(`blacklist_${token}`, blacklisted, { ex: 900 });
  return blacklisted;
}

/** True when `issuedAt` (a JWT's `iat`, in seconds) predates an admin-triggered
 *  "invalidate sessions" on this user, i.e. this token must no longer be honoured. */
export async function isSessionInvalidated(userId: string, issuedAt: number): Promise<boolean> {
  let invalidatedAtMs = await Cache.get<number>(`session_invalidated_${userId}`);
  if (invalidatedAtMs === null) {
    const invalidatedAt = await Users.getTokensInvalidatedAt(userId);
    invalidatedAtMs = invalidatedAt ? invalidatedAt.getTime() : 0;
    await Cache.set(`session_invalidated_${userId}`, invalidatedAtMs, { ex: 900 });
  }
  return invalidatedAtMs > 0 && issuedAt * 1000 < invalidatedAtMs;
}
