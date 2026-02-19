import type {
  IAuthRepository,
  IJwtService,
  IPasswordHasher,
  ITokenStore,
} from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { RegisterUseCase } from '@usecases/auth/register.usecase.js';
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

const mockTokens = { accessToken: 'mock-access', refreshToken: 'mock-refresh' };

function createMocks() {
  const authRepo: IAuthRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn(),
    findByProvider: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      provider: 'local',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const userRepo: IUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn().mockResolvedValue(mockUser),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
  };

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
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    generateTokenPair: vi.fn().mockReturnValue(mockTokens),
    getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    getRemainingSeconds: vi.fn(),
  };

  const hasher: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    verify: vi.fn(),
  };

  return { authRepo, userRepo, tokenStore, jwtService, hasher };
}

describe('RegisterUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new RegisterUseCase(
      mocks.authRepo,
      mocks.userRepo,
      mocks.tokenStore,
      mocks.jwtService,
      mocks.hasher,
    );
  });

  it('should register a new user successfully', async () => {
    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'Test1234',
      name: 'Test',
    });

    expect(result.user.email).toBe('test@example.com');
    expect(result.tokens.accessToken).toBe('mock-access');
    expect(mocks.userRepo.create).toHaveBeenCalled();
    expect(mocks.authRepo.create).toHaveBeenCalled();
    expect(mocks.tokenStore.storeRefreshToken).toHaveBeenCalled();
  });

  it('should throw on invalid email', async () => {
    await expect(
      useCase.execute({ email: '', password: 'Test1234', name: 'Test' }),
    ).rejects.toThrow();
  });

  it('should throw on weak password', async () => {
    await expect(
      useCase.execute({ email: 'a@b.com', password: 'short', name: 'Test' }),
    ).rejects.toThrow();
  });

  it('should throw on invalid name', async () => {
    await expect(
      useCase.execute({ email: 'a@b.com', password: 'Test1234', name: '' }),
    ).rejects.toThrow();
  });

  it('should throw if email already exists', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      provider: 'local' as const,
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'Test1234', name: 'Test' }),
    ).rejects.toThrow('Email already registered');
  });
});
