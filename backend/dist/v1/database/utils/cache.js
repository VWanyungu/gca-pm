import redis from '../cacheSetup.js';
import 'dotenv/config';
export class Cache {
    static async set(key, value, options = {}) {
        const EX = options.ex ?? Number(process.env.TOKEN_EXPIRY_SECONDS) ?? 900;
        await redis.set(key, value, { ex: EX });
    }
    static async get(key) {
        return redis.get(key);
    }
    static async del(key) {
        return redis.del(key);
    }
}
