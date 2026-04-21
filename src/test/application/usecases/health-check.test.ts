import { HealthCheckUseCase } from '@application/usecases/health-check.usecase';
import type { IHealthChecker } from '@domain/auth/ports';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('HealthCheckUseCase', () => {
  let healthChecker: IHealthChecker;
  let useCase: HealthCheckUseCase;

  beforeEach(() => {
    healthChecker = {
      check: vi.fn(),
    };
    useCase = new HealthCheckUseCase(healthChecker);
  });

  it('should return ok when health checker succeeds', async () => {
    vi.mocked(healthChecker.check).mockResolvedValue({ postgres: 'ok', redis: 'ok' });

    const result = await useCase.execute();

    expect(result.status).toBe('ok');
    expect(result.postgres).toBe('ok');
    expect(result.redis).toBe('ok');
    expect(result.timestamp).toBeDefined();
    expect(healthChecker.check).toHaveBeenCalled();
  });

  it('should return degraded when health checker fails', async () => {
    vi.mocked(healthChecker.check).mockRejectedValue(new Error('Connection failed'));

    const result = await useCase.execute();

    expect(result.status).toBe('degraded');
    expect(result.postgres).toBe('unknown');
    expect(result.redis).toBe('unknown');
    expect(result.timestamp).toBeDefined();
    expect(healthChecker.check).toHaveBeenCalled();
  });
});
