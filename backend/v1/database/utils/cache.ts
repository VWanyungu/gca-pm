import redis from '../cacheSetup.js';
import 'dotenv/config';

export class Cache {
  static async set(key: string, value: unknown, options: { ex?: number } = {}): Promise<void> {
    const EX = options.ex ?? Number(process.env.TOKEN_EXPIRY_SECONDS) ?? 900;
    await redis.set(key, JSON.stringify(value), { EX });
  }

  static async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  static async del(key: string): Promise<number> {
    return redis.del(key);
  }
}
