import { LoginUseCase } from '@application/usecases/auth/login.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthRecord, createMockTokens, createMockUser } from '../../fixtures/entities';
import {
  createMockAuthRepo,
  createMockPasswordHasher,
  createMockTokenService,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockUser = createMockUser();
const mockAuthRecord = createMockAuthRecord();
const mockTokens = createMockTokens();

function createMocks() {
  return {
    authRepo: createMockAuthRepo({
      findByEmail: vi.fn().mockResolvedValue(mockAuthRecord),
    }),
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(mockUser),
    }),
    tokenService: createMockTokenService({
      generateTokenPair: vi.fn().mockReturnValue(mockTokens),
      getRefreshTtlSeconds: vi.fn().mockReturnValue(604800),
    }),
    hasher: createMockPasswordHasher({
      verify: vi.fn().mockResolvedValue(true),
    }),
  };
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
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(
      createMockAuthRecord({ passwordHash: null }),
    );
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
