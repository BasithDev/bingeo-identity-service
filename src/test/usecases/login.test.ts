import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../adapters/db/auth.repository.js', () => ({
  authRepository: {
    findByEmail: vi.fn(),
  },
}));

vi.mock('../../adapters/db/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../adapters/cache/token.store.js', () => ({
  tokenStore: {
    storeRefreshToken: vi.fn(),
  },
}));

vi.mock('argon2', () => ({
  default: { verify: vi.fn() },
}));

vi.mock('../../usecases/auth/jwt.service.js', () => ({
  generateTokenPair: vi.fn().mockReturnValue({
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
  }),
  getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
}));

import argon2 from 'argon2';
import { authRepository } from '../../adapters/db/auth.repository.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import { login } from '../../usecases/auth/login.usecase.js';

const mockAuthRecord = {
  id: 'auth-1',
  userId: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  provider: 'local',
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRepository.findByEmail).mockResolvedValue(mockAuthRecord);
    vi.mocked(userRepository.findById).mockResolvedValue(mockDbUser);
    vi.mocked(argon2.verify).mockResolvedValue(true);
  });

  it('should login successfully', async () => {
    const result = await login({ email: 'test@example.com', password: 'Test1234' });
    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBe('mock-access');
  });

  it('should throw on unknown email', async () => {
    vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
    await expect(login({ email: 'no@user.com', password: 'Test1234' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('should throw on OAuth-only account', async () => {
    vi.mocked(authRepository.findByEmail).mockResolvedValue({
      ...mockAuthRecord,
      passwordHash: null,
    });
    await expect(login({ email: 'test@example.com', password: 'Test1234' })).rejects.toThrow(
      'Google sign-in',
    );
  });

  it('should throw on wrong password', async () => {
    vi.mocked(argon2.verify).mockResolvedValue(false);
    await expect(login({ email: 'test@example.com', password: 'Wrong123' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('should throw if user profile not found', async () => {
    vi.mocked(userRepository.findById).mockResolvedValue(null);
    await expect(login({ email: 'test@example.com', password: 'Test1234' })).rejects.toThrow(
      'User profile not found',
    );
  });
});
