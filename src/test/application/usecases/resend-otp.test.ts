import { ResendOtpUseCase } from '@application/usecases/auth/resend-otp.usecase';
import { DomainError } from '@domain/shared/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockUser } from '../../fixtures/entities';
import {
  createMockMailer,
  createMockOtpStore,
  createMockPasswordHasher,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockUser = createMockUser({ emailVerified: false });

function createMocks() {
  return {
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(mockUser),
    }),
    otpStore: createMockOtpStore(),
    mailer: createMockMailer(),
    hasher: createMockPasswordHasher({
      hash: vi.fn().mockResolvedValue('hashed-otp'),
    }),
  };
}

describe('ResendOtpUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: ResendOtpUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new ResendOtpUseCase(mocks.userRepo, mocks.otpStore, mocks.mailer, mocks.hasher, 600);
  });

  it('should resend OTP for an unverified user', async () => {
    const result = await uc.execute({ userId: mockUser.id });
    expect(result.message).toBe('New verification code sent');
    expect(mocks.otpStore.storeOtp).toHaveBeenCalled();
    expect(mocks.mailer.sendOtp).toHaveBeenCalled();
  });

  it('should throw USER_NOT_FOUND when user does not exist', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await expect(uc.execute({ userId: 'bad-id' })).rejects.toThrow(DomainError);
  });

  it('should throw ALREADY_VERIFIED when email is already verified', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(
      createMockUser({ emailVerified: true }),
    );
    await expect(uc.execute({ userId: mockUser.id })).rejects.toThrow(DomainError);
  });
});
