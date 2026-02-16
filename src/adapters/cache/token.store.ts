import { redisClient } from './redis.client.js';

const REFRESH_PREFIX = 'refresh:';
const BLACKLIST_PREFIX = 'blacklist:';

export const tokenStore = {
  async storeRefreshToken(userId: string, token: string, ttlSeconds: number): Promise<void> {
    await redisClient.set(`${REFRESH_PREFIX}${userId}`, token, { EX: ttlSeconds });
  },

  async getRefreshToken(userId: string): Promise<string | null> {
    return redisClient.get(`${REFRESH_PREFIX}${userId}`);
  },

  async deleteRefreshToken(userId: string): Promise<void> {
    await redisClient.del(`${REFRESH_PREFIX}${userId}`);
  },

  async deleteAllRefreshTokens(userId: string): Promise<void> {
    await redisClient.del(`${REFRESH_PREFIX}${userId}`);
  },

  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    await redisClient.set(`${BLACKLIST_PREFIX}${jti}`, '1', { EX: ttlSeconds });
  },

  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const result = await redisClient.get(`${BLACKLIST_PREFIX}${jti}`);
    return result !== null;
  },
};
