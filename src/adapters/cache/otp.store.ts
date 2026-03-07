import type { IOtpStore } from '@domain/auth/ports.js';
import type { RedisClientType } from 'redis';

const OTP_PREFIX = 'otp:';
const OTP_ATTEMPTS_PREFIX = 'otp_attempts:';

export class RedisOtpStore implements IOtpStore {
  constructor(private readonly redis: RedisClientType) {}

  async storeOtp(userId: string, hashedOtp: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${OTP_PREFIX}${userId}`, hashedOtp, { EX: ttlSeconds });
  }

  async getOtp(userId: string): Promise<string | null> {
    return this.redis.get(`${OTP_PREFIX}${userId}`);
  }

  async deleteOtp(userId: string): Promise<void> {
    await this.redis.del(`${OTP_PREFIX}${userId}`);
    await this.redis.del(`${OTP_ATTEMPTS_PREFIX}${userId}`);
  }

  async incrementAttempts(userId: string, ttlSeconds: number): Promise<number> {
    const key = `${OTP_ATTEMPTS_PREFIX}${userId}`;
    const count = await this.redis.incr(key);
    // Set TTL on first attempt
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }
}
