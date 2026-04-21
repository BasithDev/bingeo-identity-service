import { LogoutUseCase } from '@application/usecases/auth/logout.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockTokenService, createMockTokenStore } from '../../fixtures/mocks';

function createMocks() {
  return {
    tokenStore: createMockTokenStore(),
    tokenService: createMockTokenService({
      verifyAccessToken: vi.fn().mockReturnValue({
        sub: 'user-1',
        jti: 'access-jti',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        subscription: 'free',
      }),
      verifyRefreshToken: vi.fn().mockReturnValue({ sub: 'user-1', jti: 'refresh-jti' }),
      getRemainingSeconds: vi.fn().mockReturnValue(600),
    }),
  };
}

describe('LogoutUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new LogoutUseCase(mocks.tokenStore, mocks.tokenService);
  });

  it('should blacklist both access and refresh tokens on logout', async () => {
    await useCase.execute('valid-access-token', 'valid-refresh-token');
    expect(mocks.tokenStore.blacklistAccessToken).toHaveBeenCalledWith('access-jti', 600);
    expect(mocks.tokenStore.blacklistRefreshToken).toHaveBeenCalledWith('refresh-jti', 600);
  });

  it('should skip blacklisting access token if remaining is 0', async () => {
    vi.mocked(mocks.tokenService.getRemainingSeconds).mockReturnValue(0);
    await useCase.execute('valid-access-token', 'valid-refresh-token');
    expect(mocks.tokenStore.blacklistAccessToken).not.toHaveBeenCalled();
    expect(mocks.tokenStore.blacklistRefreshToken).not.toHaveBeenCalled();
  });

  it('should gracefully handle expired access token', async () => {
    vi.mocked(mocks.tokenService.verifyAccessToken).mockImplementation(() => {
      throw new Error('expired');
    });
    await expect(useCase.execute('expired-token')).resolves.toBeUndefined();
  });

  it('should still work if no refresh token provided', async () => {
    await useCase.execute('valid-access-token');
    expect(mocks.tokenStore.blacklistAccessToken).toHaveBeenCalled();
    expect(mocks.tokenStore.blacklistRefreshToken).not.toHaveBeenCalled();
  });
});
