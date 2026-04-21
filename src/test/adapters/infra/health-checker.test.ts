import { InfraHealthChecker } from '@adapters/infra/health-checker';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('InfraHealthChecker', () => {
  let pool: Pool;
  let redis: RedisClientType;
  let healthChecker: InfraHealthChecker;

  beforeEach(() => {
    pool = {
      query: vi.fn(),
    } as unknown as Pool;

    redis = {
      ping: vi.fn(),
    } as unknown as RedisClientType;

    healthChecker = new InfraHealthChecker(pool, redis);
  });

  it('should return ok when both ping successfully', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rowCount: 1 } as any);
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    const result = await healthChecker.check();

    expect(result).toEqual({ postgres: 'ok', redis: 'ok' });
    expect(pool.query).toHaveBeenCalledWith('SELECT 1');
    expect(redis.ping).toHaveBeenCalled();
  });

  it('should throw when postgres fails', async () => {
    vi.mocked(pool.query).mockRejectedValue(new Error('PG Error'));
    vi.mocked(redis.ping).mockResolvedValue('PONG');

    await expect(healthChecker.check()).rejects.toThrow('PG Error');
  });

  it('should throw when redis fails', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rowCount: 1 } as any);
    vi.mocked(redis.ping).mockRejectedValue(new Error('Redis Error'));

    await expect(healthChecker.check()).rejects.toThrow('Redis Error');
  });
});
