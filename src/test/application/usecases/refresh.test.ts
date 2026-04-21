import { RefreshUseCase } from '@application/usecases/auth/refresh.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockUser } from '../../fixtures/entities';
import {
  createMockTokenService,
  createMockTokenStore,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockUser = createMockUser();
const VALID_REFRESH_TOKEN = 'valid-refresh-token';

function createMocks() {
  return {
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(mockUser),
    }),
    tokenStore: createMockTokenStore(),
    tokenService: createMockTokenService({
      signAccessToken: vi.fn().mockReturnValue('new-access-token'),
      verifyRefreshToken: vi.fn().mockReturnValue({ typ: 'refresh', sub: mockUser.id, jti: 'jti-1' }),
      getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    }),
  };
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
    expect(result.user.id).toBe(mockUser.id);
    expect(result.tokens.accessToken).toBe('new-access-token');
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

  it('should throw if an access token is used instead of refresh token', async () => {
    vi.mocked(mocks.tokenService.verifyRefreshToken).mockReturnValue({
      typ: 'access' as unknown as 'refresh',
      sub: mockUser.id,
      jti: 'jti-2',
    });
    await expect(useCase.execute('access-token-value')).rejects.toThrow('Invalid token type');
  });
});
