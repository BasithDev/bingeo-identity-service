import type { IAuthRepository, IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { ForgotPasswordUseCase } from '@usecases/auth/forgot-password.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthRecord = {
  id: 'auth-1',
  userId: 'user-1',
  email: 'test@example.com',
  passwordHash: 'hashed-pw',
  provider: 'local' as const,
  providerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
  const hasher: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue('hashed-otp'),
    verify: vi.fn(),
  };
  const otpStore: IOtpStore = {
    storeOtp: vi.fn(),
    getOtp: vi.fn(),
    deleteOtp: vi.fn(),
    incrementAttempts: vi.fn(),
  };
  const mailer: IMailer = {
    sendOtp: vi.fn(),
    sendPasswordReset: vi.fn(),
  };

  return { authRepo, userRepo, hasher, otpStore, mailer };
}

describe('ForgotPasswordUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: ForgotPasswordUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new ForgotPasswordUseCase(
      mocks.authRepo,
      mocks.userRepo,
      mocks.hasher,
      mocks.otpStore,
      mocks.mailer,
      600,
    );
  });

  it('should send a password reset OTP for a valid local account', async () => {
    const result = await uc.execute({ email: 'test@example.com' });
    expect(result.userId).toBe('user-1');
    expect(mocks.otpStore.storeOtp).toHaveBeenCalled();
    expect(mocks.mailer.sendPasswordReset).toHaveBeenCalled();
  });

  it('should return generic message for unknown email (no leak)', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(null);
    const result = await uc.execute({ email: 'unknown@example.com' });
    expect(result.userId).toBe('');
    expect(mocks.mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('should throw OAUTH_ACCOUNT for accounts without a password', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue({
      ...mockAuthRecord,
      passwordHash: null,
    });
    await expect(uc.execute({ email: 'test@example.com' })).rejects.toThrow(DomainError);
  });

  it('should use "there" as name when user not found', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await uc.execute({ email: 'test@example.com' });
    expect(mocks.mailer.sendPasswordReset).toHaveBeenCalledWith(
      'test@example.com',
      expect.any(String),
      'there',
    );
  });
});
