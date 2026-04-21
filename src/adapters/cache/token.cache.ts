import type { ITokenStore, IUserBlockStore } from '@domain/auth/ports';
import type { RedisClientType } from 'redis';

const REFRESH_BLACKLIST_PREFIX = 'refresh_bl:';
const ACCESS_BLACKLIST_PREFIX = 'access_bl:';
const BLOCKED_USER_PREFIX = 'blocked_user:';

export class RedisTokenCache implements ITokenStore, IUserBlockStore {
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

  async blockUser(userId: string): Promise<void> {
    await this.redis.set(`${BLOCKED_USER_PREFIX}${userId}`, '1');
  }

  async unblockUser(userId: string): Promise<void> {
    await this.redis.del(`${BLOCKED_USER_PREFIX}${userId}`);
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const result = await this.redis.get(`${BLOCKED_USER_PREFIX}${userId}`);
    return result !== null;
  }
}
