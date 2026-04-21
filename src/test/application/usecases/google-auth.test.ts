import { GoogleAuthUseCase } from '@application/usecases/auth/google-auth.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthRecord, createMockTokens, createMockUser } from '../../fixtures/entities';
import {
  createMockAuthRepo,
  createMockGoogleOAuth,
  createMockTokenService,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockUser = createMockUser({ email: 'test@google.com', name: 'Google User' });
const mockTokens = createMockTokens();

function createMocks() {
  return {
    authRepo: createMockAuthRepo({
      findByProvider: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(
        createMockAuthRecord({
          email: 'test@google.com',
          passwordHash: null,
          provider: 'google',
          providerId: 'google-123',
        }),
      ),
    }),
    userRepo: createMockUserRepo({
      create: vi.fn().mockResolvedValue(mockUser),
      verifyEmail: vi.fn().mockResolvedValue(mockUser),
    }),
    tokenService: createMockTokenService({
      generateTokenPair: vi.fn().mockReturnValue(mockTokens),
      getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    }),
    googleOAuth: createMockGoogleOAuth({
      exchangeCode: vi.fn().mockResolvedValue({
        googleId: 'google-123',
        email: 'test@google.com',
        name: 'Google User',
      }),
    }),
  };
}

describe('GoogleAuthUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: GoogleAuthUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new GoogleAuthUseCase(
      mocks.authRepo,
      mocks.userRepo,
      mocks.tokenService,
      mocks.googleOAuth,
    );
  });

  it('should return existing Google user', async () => {
    vi.mocked(mocks.authRepo.findByProvider).mockResolvedValue(
      createMockAuthRecord({
        email: 'test@google.com',
        passwordHash: null,
        provider: 'google',
        providerId: 'google-123',
      }),
    );
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
    vi.mocked(mocks.authRepo.findByProvider).mockResolvedValue(
      createMockAuthRecord({
        userId: 'user-gone',
        email: 'test@google.com',
        passwordHash: null,
        provider: 'google',
        providerId: 'google-123',
      }),
    );
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute('auth-code')).rejects.toThrow('User profile missing');
  });
});
