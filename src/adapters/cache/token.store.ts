import type { ITokenStore } from '@domain/auth/ports.js';
import type { RedisClientType } from 'redis';

const REFRESH_PREFIX = 'refresh:';
const BLACKLIST_PREFIX = 'blacklist:';

export class RedisTokenStore implements ITokenStore {
  constructor(private readonly redis: RedisClientType) {}

  async storeRefreshToken(userId: string, token: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${REFRESH_PREFIX}${userId}`, token, { EX: ttlSeconds });
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return this.redis.get(`${REFRESH_PREFIX}${userId}`);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`${REFRESH_PREFIX}${userId}`);
  }

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await this.redis.del(`${REFRESH_PREFIX}${userId}`);
  }

  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${BLACKLIST_PREFIX}${jti}`, '1', { EX: ttlSeconds });
  }

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await this.redis.get(`${BLACKLIST_PREFIX}${jti}`);
    return result !== null;
  }
}
