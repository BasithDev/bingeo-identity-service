import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../adapters/external/google-oauth.client.js', () => ({
  exchangeGoogleCode: vi.fn(),
}));

vi.mock('../../adapters/db/auth.repository.js', () => ({
  authRepository: {
    findByProvider: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../adapters/db/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../adapters/cache/token.store.js', () => ({
  tokenStore: {
    storeRefreshToken: vi.fn(),
  },
}));

vi.mock('../../usecases/auth/jwt.service.js', () => ({
  generateTokenPair: vi.fn().mockReturnValue({
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
  }),
  getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
}));

import { authRepository } from '../../adapters/db/auth.repository.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import { exchangeGoogleCode } from '../../adapters/external/google-oauth.client.js';
import { googleAuth } from '../../usecases/auth/google-auth.usecase.js';

const mockDbUser = {
  id: 'user-1',
  email: 'test@google.com',
  name: 'Google User',
  role: 'user',
  subscription: 'free',
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('googleAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exchangeGoogleCode).mockResolvedValue({
      googleId: 'google-123',
      email: 'test@google.com',
      name: 'Google User',
    });
  });

  it('should return existing Google user', async () => {
    vi.mocked(authRepository.findByProvider).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google',
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(userRepository.findById).mockResolvedValue(mockDbUser);

    const result = await googleAuth('auth-code');
    expect(result.user.email).toBe('test@google.com');
    expect(result.isNewUser).toBe(false);
    expect(authRepository.create).not.toHaveBeenCalled();
  });

  it('should link Google to existing email user', async () => {
    vi.mocked(authRepository.findByProvider).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(mockDbUser);
    vi.mocked(authRepository.create).mockResolvedValue({
      id: 'auth-2',
      userId: 'user-1',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google',
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await googleAuth('auth-code');
    expect(result.isNewUser).toBe(false);
    expect(authRepository.create).toHaveBeenCalled();
  });

  it('should create brand new user', async () => {
    vi.mocked(authRepository.findByProvider).mockResolvedValue(null);
    vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(mockDbUser);
    vi.mocked(authRepository.create).mockResolvedValue({
      id: 'auth-3',
      userId: 'user-1',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google',
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await googleAuth('auth-code');
    expect(result.isNewUser).toBe(true);
    expect(userRepository.create).toHaveBeenCalled();
    expect(authRepository.create).toHaveBeenCalled();
  });

  it('should throw if existing auth record but user profile missing', async () => {
    vi.mocked(authRepository.findByProvider).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-gone',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google',
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(userRepository.findById).mockResolvedValue(null);

    await expect(googleAuth('auth-code')).rejects.toThrow('User profile missing');
  });
});
