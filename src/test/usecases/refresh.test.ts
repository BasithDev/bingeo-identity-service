import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../adapters/cache/token.store.js', () => ({
  tokenStore: {
    getRefreshToken: vi.fn(),
    storeRefreshToken: vi.fn(),
    deleteAllRefreshTokens: vi.fn(),
  },
}));

vi.mock('../../adapters/db/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../usecases/auth/jwt.service.js', () => ({
  verifyRefreshToken: vi.fn(),
  generateTokenPair: vi.fn().mockReturnValue({
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  }),
  getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
}));

import { tokenStore } from '../../adapters/cache/token.store.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import { verifyRefreshToken } from '../../usecases/auth/jwt.service.js';
import { refreshTokens } from '../../usecases/auth/refresh.usecase.js';

const mockDbUser = {
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

describe('refreshTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyRefreshToken).mockReturnValue({ sub: 'user-1', jti: 'jti-1' });
    vi.mocked(tokenStore.getRefreshToken).mockResolvedValue('valid-refresh-token');
    vi.mocked(userRepository.findById).mockResolvedValue(mockDbUser);
  });

  it('should rotate tokens successfully', async () => {
    const result = await refreshTokens('valid-refresh-token');
    expect(result.user.id).toBe('user-1');
    expect(result.tokens.accessToken).toBe('new-access');
    expect(tokenStore.storeRefreshToken).toHaveBeenCalled();
  });

  it('should throw on invalid refresh token', async () => {
    vi.mocked(verifyRefreshToken).mockImplementation(() => {
      throw new Error('invalid');
    });
    await expect(refreshTokens('bad-token')).rejects.toThrow('Invalid or expired refresh token');
  });

  it('should throw and revoke all on token mismatch (theft detection)', async () => {
    vi.mocked(tokenStore.getRefreshToken).mockResolvedValue('different-token');
    await expect(refreshTokens('valid-refresh-token')).rejects.toThrow('revoked');
    expect(tokenStore.deleteAllRefreshTokens).toHaveBeenCalledWith('user-1');
  });

  it('should throw and revoke if no stored token', async () => {
    vi.mocked(tokenStore.getRefreshToken).mockResolvedValue(null);
    await expect(refreshTokens('valid-refresh-token')).rejects.toThrow('revoked');
  });

  it('should throw if user not found', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    await expect(refreshTokens('valid-refresh-token')).rejects.toThrow('User not found');
  });
});
