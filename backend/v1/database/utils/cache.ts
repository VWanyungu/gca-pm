import redis from '../cacheSetup.js';
import 'dotenv/config';

export class Cache {
  static async set(key: string, value: unknown, options: { ex?: number } = {}): Promise<void> {
    const EX = options.ex ?? Number(process.env.TOKEN_EXPIRY_SECONDS) ?? 900;
    await redis.set(key, value, { ex: EX });
  }

  static async get<T = unknown>(key: string): Promise<T | null> {
    return redis.get<T>(key);
  }

  static async del(key: string): Promise<number> {
    return redis.del(key);
  }
}
