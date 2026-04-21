import type { IHealthChecker } from '@domain/auth/ports';

export interface IHealthCheckExecutor {
  execute(): Promise<{
    status: string;
    postgres: string;
    redis: string;
    timestamp: string;
  }>;
}

export class HealthCheckUseCase implements IHealthCheckExecutor {
  constructor(private readonly healthChecker: IHealthChecker) {}

  async execute(): Promise<{
    status: string;
    postgres: string;
    redis: string;
    timestamp: string;
  }> {
    try {
      const result = await this.healthChecker.check();
      return {
        status: 'ok',
        postgres: result.postgres,
        redis: result.redis,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'degraded',
        postgres: 'unknown',
        redis: 'unknown',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
