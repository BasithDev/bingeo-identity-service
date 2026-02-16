import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all dependencies
vi.mock('../../adapters/db/auth.repository.js', () => ({
  authRepository: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../adapters/db/user.repository.js', () => ({
  userRepository: {
    create: vi.fn(),
  },
}));

vi.mock('../../adapters/cache/token.store.js', () => ({
  tokenStore: {
    storeRefreshToken: vi.fn(),
  },
}));

vi.mock('argon2', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}));

vi.mock('../../usecases/auth/jwt.service.js', () => ({
  generateTokenPair: vi.fn().mockReturnValue({
    accessToken: 'mock-access',
    refreshToken: 'mock-refresh',
  }),
  getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
}));

import { tokenStore } from '../../adapters/cache/token.store.js';
import { authRepository } from '../../adapters/db/auth.repository.js';
import { userRepository } from '../../adapters/db/user.repository.js';
import { register } from '../../usecases/auth/register.usecase.js';

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

describe('register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(userRepository.create).mockResolvedValue(mockDbUser);
    vi.mocked(authRepository.create).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      provider: 'local',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should register a new user successfully', async () => {
    const result = await register({
      email: 'test@example.com',
      password: 'Test1234',
      name: 'Test',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBe('mock-access');
    expect(userRepository.create).toHaveBeenCalled();
    expect(authRepository.create).toHaveBeenCalled();
    expect(tokenStore.storeRefreshToken).toHaveBeenCalled();
  });

  it('should throw on invalid email', async () => {
    await expect(register({ email: '', password: 'Test1234', name: 'Test' })).rejects.toThrow();
  });

  it('should throw on weak password', async () => {
    await expect(register({ email: 'a@b.com', password: 'short', name: 'Test' })).rejects.toThrow();
  });

  it('should throw on invalid name', async () => {
    await expect(register({ email: 'a@b.com', password: 'Test1234', name: '' })).rejects.toThrow();
  });

  it('should throw if email already exists', async () => {
    vi.mocked(authRepository.findByEmail).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      provider: 'local',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      register({ email: 'test@example.com', password: 'Test1234', name: 'Test' }),
    ).rejects.toThrow('Email already registered');
  });
});
