import type { IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { ResendOtpUseCase } from '@usecases/auth/resend-otp.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  role: 'user',
  subscription: 'free',
  emailVerified: false,
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMocks() {
  const userRepo: IUserRepository = {
    findById: vi.fn().mockResolvedValue(mockUser),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
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
  const hasher: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue('hashed-otp'),
    verify: vi.fn(),
  };

  return { userRepo, otpStore, mailer, hasher };
}

describe('ResendOtpUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: ResendOtpUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new ResendOtpUseCase(mocks.userRepo, mocks.otpStore, mocks.mailer, mocks.hasher, 600);
  });

  it('should resend OTP for an unverified user', async () => {
    const result = await uc.execute({ userId: 'user-1' });
    expect(result.message).toBe('New verification code sent');
    expect(mocks.otpStore.storeOtp).toHaveBeenCalled();
    expect(mocks.mailer.sendOtp).toHaveBeenCalled();
  });

  it('should throw USER_NOT_FOUND when user does not exist', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await expect(uc.execute({ userId: 'bad-id' })).rejects.toThrow(DomainError);
  });

  it('should throw ALREADY_VERIFIED when email is already verified', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue({ ...mockUser, emailVerified: true });
    await expect(uc.execute({ userId: 'user-1' })).rejects.toThrow(DomainError);
  });
});
