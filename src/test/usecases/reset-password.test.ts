import type { IAuthRepository, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import { ResetPasswordUseCase } from '@usecases/auth/reset-password.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function createMocks() {
  const authRepo: IAuthRepository = {
    findByEmail: vi.fn(),
    findByUserId: vi.fn(),
    findByProvider: vi.fn(),
    create: vi.fn(),
    updatePasswordHash: vi.fn(),
  };
  const hasher: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue('new-hash'),
    verify: vi.fn().mockResolvedValue(true),
  };
  const otpStore: IOtpStore = {
    storeOtp: vi.fn(),
    getOtp: vi.fn().mockResolvedValue('stored-hash'),
    deleteOtp: vi.fn(),
    incrementAttempts: vi.fn().mockResolvedValue(1),
  };

  return { authRepo, hasher, otpStore };
}

describe('ResetPasswordUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: ResetPasswordUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new ResetPasswordUseCase(mocks.authRepo, mocks.hasher, mocks.otpStore, 5);
  });

  it('should reset password successfully', async () => {
    const result = await uc.execute({ userId: 'user-1', otp: '123456', newPassword: 'NewPass1' });
    expect(result.message).toBe('Password reset successfully.');
    expect(mocks.authRepo.updatePasswordHash).toHaveBeenCalledWith('user-1', 'new-hash');
    expect(mocks.otpStore.deleteOtp).toHaveBeenCalled();
  });

  it('should throw OTP_MAX_ATTEMPTS when too many attempts', async () => {
    vi.mocked(mocks.otpStore.incrementAttempts).mockResolvedValue(6);
    await expect(
      uc.execute({ userId: 'user-1', otp: '123456', newPassword: 'NewPass1' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw OTP_EXPIRED when no stored OTP', async () => {
    vi.mocked(mocks.otpStore.getOtp).mockResolvedValue(null);
    await expect(
      uc.execute({ userId: 'user-1', otp: '123456', newPassword: 'NewPass1' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw OTP_INVALID when OTP does not match', async () => {
    vi.mocked(mocks.hasher.verify).mockResolvedValue(false);
    await expect(
      uc.execute({ userId: 'user-1', otp: 'wrong', newPassword: 'NewPass1' }),
    ).rejects.toThrow(DomainError);
  });

  it('should throw on invalid new password', async () => {
    await expect(
      uc.execute({ userId: 'user-1', otp: '123456', newPassword: 'short' }),
    ).rejects.toThrow(DomainError);
  });
});
