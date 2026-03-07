import type { IAuthRepository, IPasswordHasher, ITokenService } from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { LoginUseCase } from '@usecases/auth/login.usecase.js';
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

const mockAuthRecord = {
  id: 'auth-1',
  userId: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  provider: 'local' as const,
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTokens = { accessToken: 'mock-access', refreshToken: 'mock-refresh' };

function createMocks() {
  const authRepo: IAuthRepository = {
    findByEmail: vi.fn().mockResolvedValue(mockAuthRecord),
    findByUserId: vi.fn(),
    findByProvider: vi.fn(),
    create: vi.fn(),
    updatePasswordHash: vi.fn(),
  };

  const userRepo: IUserRepository = {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
  };

  const tokenService: ITokenService = {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    generateTokenPair: vi.fn().mockReturnValue(mockTokens),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    getRemainingSeconds: vi.fn(),
  };

  const hasher: IPasswordHasher = {
    hash: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
  };

  return { authRepo, userRepo, tokenService, hasher };
}

describe('LoginUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: LoginUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new LoginUseCase(mocks.authRepo, mocks.userRepo, mocks.tokenService, mocks.hasher);
  });

  it('should login successfully', async () => {
    const result = await useCase.execute({ email: 'test@example.com', password: 'Test1234' });
    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBe('mock-access');
  });

  it('should throw on unknown email', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(null);
    await expect(useCase.execute({ email: 'no@user.com', password: 'Test1234' })).rejects.toThrow(
      'Invalid email or password',
    );
  });

  it('should throw on OAuth-only account', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue({
      ...mockAuthRecord,
      passwordHash: null,
    });
    await expect(
      useCase.execute({ email: 'test@example.com', password: 'Test1234' }),
    ).rejects.toThrow('Google sign-in');
  });

  it('should throw on wrong password', async () => {
    vi.mocked(mocks.hasher.verify).mockResolvedValue(false);
    await expect(
      useCase.execute({ email: 'test@example.com', password: 'Wrong123' }),
    ).rejects.toThrow('Invalid email or password');
  });

  it('should throw if user profile not found', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await expect(
      useCase.execute({ email: 'test@example.com', password: 'Test1234' }),
    ).rejects.toThrow('User profile not found');
  });
});
