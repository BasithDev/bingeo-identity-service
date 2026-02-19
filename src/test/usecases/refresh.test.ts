import type { IJwtService, ITokenStore } from '@domain/auth/ports.js';
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
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };

function createMocks() {
  const userRepo: IUserRepository = {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
  };

  const tokenStore: ITokenStore = {
    storeRefreshToken: vi.fn(),
    getRefreshToken: vi.fn().mockResolvedValue('valid-refresh-token'),
    deleteRefreshToken: vi.fn(),
    deleteAllRefreshTokens: vi.fn(),
    blacklistAccessToken: vi.fn(),
    isAccessTokenBlacklisted: vi.fn(),
  };

  const jwtService: IJwtService = {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn().mockReturnValue({ sub: 'user-1', jti: 'jti-1' }),
    generateTokenPair: vi.fn().mockReturnValue(mockTokens),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    getRemainingSeconds: vi.fn(),
  };

  return { userRepo, tokenStore, jwtService };
}

describe('RefreshUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: RefreshUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new RefreshUseCase(mocks.userRepo, mocks.tokenStore, mocks.jwtService);
  });

  it('should rotate tokens successfully', async () => {
    const result = await useCase.execute('valid-refresh-token');
    expect(result.user.id).toBe('user-1');
    expect(result.tokens.accessToken).toBe('new-access');
    expect(mocks.tokenStore.storeRefreshToken).toHaveBeenCalled();
  });

  it('should throw on invalid refresh token', async () => {
    vi.mocked(mocks.jwtService.verifyRefreshToken).mockImplementation(() => {
      throw new Error('invalid');
    });
    await expect(useCase.execute('bad-token')).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should throw and revoke all on token mismatch (theft detection)', async () => {
    vi.mocked(mocks.tokenStore.getRefreshToken).mockResolvedValue('different-token');
    await expect(useCase.execute('valid-refresh-token')).rejects.toThrow('revoked');
    expect(mocks.tokenStore.deleteAllRefreshTokens).toHaveBeenCalledWith('user-1');
  });

  it('should throw and revoke if no stored token', async () => {
    vi.mocked(mocks.tokenStore.getRefreshToken).mockResolvedValue(null);
    await expect(useCase.execute('valid-refresh-token')).rejects.toThrow('revoked');
  });

  it('should throw if user not found', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await expect(useCase.execute('valid-refresh-token')).rejects.toThrow('User not found');
  });
});
