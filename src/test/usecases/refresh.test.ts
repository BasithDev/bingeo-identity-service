import type { ITokenService, ITokenStore } from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { RefreshUseCase } from '@usecases/auth/refresh.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  role: 'user',
  subscription: 'free',
  emailVerified: true,
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const VALID_REFRESH_TOKEN = 'valid-refresh-token';

function createMocks() {
  const userRepo: IUserRepository = {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
  };

  const tokenStore: ITokenStore = {
    blacklistRefreshToken: vi.fn(),
    isRefreshTokenBlacklisted: vi.fn().mockResolvedValue(false),
    blacklistAccessToken: vi.fn(),
    isAccessTokenBlacklisted: vi.fn().mockResolvedValue(false),
  };

  const tokenService: ITokenService = {
    signAccessToken: vi.fn().mockReturnValue('new-access-token'),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn().mockReturnValue({ sub: 'user-1', jti: 'jti-1' }),
    generateTokenPair: vi.fn(),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    getRemainingSeconds: vi.fn(),
  };

  return { userRepo, tokenStore, tokenService };
}

describe('RefreshUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: RefreshUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new RefreshUseCase(mocks.userRepo, mocks.tokenStore, mocks.tokenService);
  });

  it('should issue new access token and reuse refresh token', async () => {
    const result = await useCase.execute(VALID_REFRESH_TOKEN);
    expect(result.user.id).toBe('user-1');
    expect(result.tokens.accessToken).toBe('new-access-token');
    // Refresh token is reused (not rotated)
    expect(result.tokens.refreshToken).toBe(VALID_REFRESH_TOKEN);
  });

  it('should throw on invalid refresh token', async () => {
    vi.mocked(mocks.tokenService.verifyRefreshToken).mockImplementation(() => {
      throw new Error('invalid');
    });
    await expect(useCase.execute('bad-token')).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should throw if token jti is blacklisted', async () => {
    vi.mocked(mocks.tokenStore.isRefreshTokenBlacklisted).mockResolvedValue(true);
    await expect(useCase.execute(VALID_REFRESH_TOKEN)).rejects.toThrow('revoked');
  });

  it('should throw if user not found', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute(VALID_REFRESH_TOKEN)).rejects.toThrow('User not found');
  });
});
