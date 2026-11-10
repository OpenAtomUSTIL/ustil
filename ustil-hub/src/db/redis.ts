import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REFRESH_TOKEN_STORE = 'REFRESH_TOKEN_STORE';

export type RedisClient = Pick<Redis, 'get' | 'set' | 'del' | 'incr' | 'expire' | 'scan'>;

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  }
  return redisInstance;
}

export const redisProvider = {
  provide: REDIS_CLIENT,
  useFactory: getRedis,
};

// refresh_token jti 白名单存储（AGENTS.md §11.2）
export class RefreshTokenStore {
  constructor(private readonly redis: RedisClient) {}

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  async register(userId: string, jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(this.key(userId, jti), '1', 'EX', ttlSeconds);
  }

  async has(userId: string, jti: string): Promise<boolean> {
    return (await this.redis.get(this.key(userId, jti))) !== null;
  }

  async revoke(userId: string, jti: string): Promise<void> {
    await this.redis.del(this.key(userId, jti));
  }

  async revokeAll(userId: string): Promise<void> {
    const pattern = `refresh:${userId}:*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }
}

export const refreshTokenStoreProvider = {
  provide: REFRESH_TOKEN_STORE,
  useFactory: (redis: RedisClient) => new RefreshTokenStore(redis),
  inject: [REDIS_CLIENT],
};
