import { Cache } from '../database/utils/cache.js';
import { Tokens } from '../database/utils/database.js';

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const cached = await Cache.get<boolean>(`blacklist_${token}`);
  if (cached !== null) return cached === true;

  const blacklisted = await Tokens.checkBlacklistToken(token);
  await Cache.set(`blacklist_${token}`, blacklisted, { ex: 900 });
  return blacklisted;
}
