import { ResetPasswordUseCase } from '@application/usecases/auth/reset-password.usecase';
import { DomainError } from '@domain/shared/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthRecord } from '../../fixtures/entities';
import {
  createMockAuthRepo,
  createMockOtpStore,
  createMockPasswordHasher,
} from '../../fixtures/mocks';

function createMocks() {
  return {
    authRepo: createMockAuthRepo({
      findByEmail: vi.fn().mockResolvedValue(createMockAuthRecord()),
    }),
    hasher: createMockPasswordHasher({
      hash: vi.fn().mockResolvedValue('new-hash'),
      verify: vi.fn().mockResolvedValue(true),
    }),
    otpStore: createMockOtpStore({
      getOtp: vi.fn().mockResolvedValue('stored-hash'),
      incrementAttempts: vi.fn().mockResolvedValue(1),
    }),
  };
}

describe('ResetPasswordUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: ResetPasswordUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new ResetPasswordUseCase(mocks.authRepo, mocks.hasher, mocks.otpStore, 5);
  });

  it('should reset password successfully', async () => {
    const result = await uc.execute({
      email: 'test@example.com',
      otp: '123456',
      newPassword: 'NewPass1',
    });
    expect(result.message).toBe('Password reset successfully.');
    expect(mocks.authRepo.updatePasswordHash).toHaveBeenCalled();
    expect(mocks.otpStore.deleteOtp).toHaveBeenCalled();
  });

  it('should throw OTP_MAX_ATTEMPTS when too many attempts', async () => {
    vi.mocked(mocks.otpStore.incrementAttempts).mockResolvedValue(6);
    await expect(
      uc.execute({ email: 'test@example.com', otp: '123456', newPassword: 'NewPass1' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw OTP_EXPIRED when no stored OTP', async () => {
    vi.mocked(mocks.otpStore.getOtp).mockResolvedValue(null);
    await expect(
      uc.execute({ email: 'test@example.com', otp: '123456', newPassword: 'NewPass1' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw OTP_INVALID when OTP does not match', async () => {
    vi.mocked(mocks.hasher.verify).mockResolvedValue(false);
    await expect(
      uc.execute({ email: 'test@example.com', otp: 'wrong0', newPassword: 'NewPass1' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw on invalid new password', async () => {
    await expect(
      uc.execute({ email: 'test@example.com', otp: '123456', newPassword: 'short' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw INVALID_RESET when auth record not found', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(null);
    await expect(
      uc.execute({ email: 'gone@example.com', otp: '123456', newPassword: 'NewPass1' }),
    ).rejects.toThrow('Invalid reset request');
  });
});
