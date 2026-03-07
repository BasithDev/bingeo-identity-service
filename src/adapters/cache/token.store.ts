import type { ITokenStore } from '@domain/auth/ports.js';
import type { RedisClientType } from 'redis';

const REFRESH_BLACKLIST_PREFIX = 'refresh_bl:';
const ACCESS_BLACKLIST_PREFIX = 'access_bl:';

export class RedisTokenStore implements ITokenStore {
  constructor(private readonly redis: RedisClientType) {}

  async blacklistRefreshToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${REFRESH_BLACKLIST_PREFIX}${jti}`, '1', { EX: ttlSeconds });
  }

  async isRefreshTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`${REFRESH_BLACKLIST_PREFIX}${jti}`);
    return result !== null;
  }

  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${ACCESS_BLACKLIST_PREFIX}${jti}`, '1', { EX: ttlSeconds });
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`${ACCESS_BLACKLIST_PREFIX}${jti}`);
    return result !== null;
  }
}
