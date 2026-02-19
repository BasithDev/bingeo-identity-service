import type { IJwtService, ITokenStore } from '@domain/auth/ports.js';
import { LogoutUseCase } from '@usecases/auth/logout.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMocks() {
  const tokenStore: ITokenStore = {
    storeRefreshToken: vi.fn(),
    getRefreshToken: vi.fn(),
    deleteRefreshToken: vi.fn(),
    deleteAllRefreshTokens: vi.fn(),
    blacklistAccessToken: vi.fn(),
    isAccessTokenBlacklisted: vi.fn(),
  };

  const jwtService: IJwtService = {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn().mockReturnValue({
      sub: 'user-1',
      jti: 'jti-123',
      email: 'test@example.com',
      name: 'Test',
      role: 'user',
      subscription: 'free',
    }),
    verifyRefreshToken: vi.fn(),
    generateTokenPair: vi.fn(),
    getRefreshTtlSeconds: vi.fn(),
    getRemainingSeconds: vi.fn().mockReturnValue(600),
  };

  return { tokenStore, jwtService };
}

describe('LogoutUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: LogoutUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new LogoutUseCase(mocks.tokenStore, mocks.jwtService);
  });

  it('should blacklist access token and delete refresh token', async () => {
    await useCase.execute('valid-access-token');
    expect(mocks.tokenStore.blacklistAccessToken).toHaveBeenCalledWith('jti-123', 600);
    expect(mocks.tokenStore.deleteRefreshToken).toHaveBeenCalledWith('user-1');
  });

  it('should skip blacklisting if remaining is 0', async () => {
    vi.mocked(mocks.jwtService.getRemainingSeconds).mockReturnValue(0);
    await useCase.execute('valid-access-token');
    expect(mocks.tokenStore.blacklistAccessToken).not.toHaveBeenCalled();
    expect(mocks.tokenStore.deleteRefreshToken).toHaveBeenCalled();
  });

  it('should gracefully handle expired token', async () => {
    vi.mocked(mocks.jwtService.verifyAccessToken).mockImplementation(() => {
      throw new Error('expired');
    });
    await expect(useCase.execute('expired-token')).resolves.toBeUndefined();
  });
});
