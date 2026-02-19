import type {
  IAuthRepository,
  IGoogleOAuthClient,
  IJwtService,
  ITokenStore,
} from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { GoogleAuthUseCase } from '@usecases/auth/google-auth.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser: UserProfile = {
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

const mockTokens = { accessToken: 'mock-access', refreshToken: 'mock-refresh' };

function createMocks() {
  const authRepo: IAuthRepository = {
    findByEmail: vi.fn(),
    findByUserId: vi.fn(),
    findByProvider: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({
      id: 'auth-new',
      userId: 'user-1',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google' as const,
      providerId: 'google-123',
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

  const googleOAuth: IGoogleOAuthClient = {
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn().mockResolvedValue({
      googleId: 'google-123',
      email: 'test@google.com',
      name: 'Google User',
    }),
  };

  return { authRepo, userRepo, tokenStore, jwtService, googleOAuth };
}

describe('GoogleAuthUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: GoogleAuthUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new GoogleAuthUseCase(
      mocks.authRepo,
      mocks.userRepo,
      mocks.tokenStore,
      mocks.jwtService,
      mocks.googleOAuth,
    );
  });

  it('should return existing Google user', async () => {
    vi.mocked(mocks.authRepo.findByProvider).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google' as const,
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(mockUser);

    const result = await useCase.execute('auth-code');
    expect(result.user.email).toBe('test@google.com');
    expect(result.isNewUser).toBe(false);
    expect(mocks.authRepo.create).not.toHaveBeenCalled();
  });

  it('should link Google to existing email user', async () => {
    vi.mocked(mocks.userRepo.findByEmail).mockResolvedValue(mockUser);

    const result = await useCase.execute('auth-code');
    expect(result.isNewUser).toBe(false);
    expect(mocks.authRepo.create).toHaveBeenCalled();
  });

  it('should create brand new user', async () => {
    vi.mocked(mocks.userRepo.findByEmail).mockResolvedValue(null);

    const result = await useCase.execute('auth-code');
    expect(result.isNewUser).toBe(true);
    expect(mocks.userRepo.create).toHaveBeenCalled();
    expect(mocks.authRepo.create).toHaveBeenCalled();
  });

  it('should throw if existing auth record but user profile missing', async () => {
    vi.mocked(mocks.authRepo.findByProvider).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-gone',
      email: 'test@google.com',
      passwordHash: null,
      provider: 'google' as const,
      providerId: 'google-123',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('auth-code')).rejects.toThrow('User profile missing');
  });
});
