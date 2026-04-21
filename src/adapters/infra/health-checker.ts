import type { IHealthChecker } from '@domain/auth/ports';
import type { Pool } from 'pg';
import type { RedisClientType } from 'redis';

export class InfraHealthChecker implements IHealthChecker {
  constructor(
    private readonly pool: Pool,
    private readonly redis: RedisClientType,
  ) {}

  async check(): Promise<{ postgres: string; redis: string }> {
    await this.pool.query('SELECT 1');
    await this.redis.ping();
    return { postgres: 'ok', redis: 'ok' };
  }
}
