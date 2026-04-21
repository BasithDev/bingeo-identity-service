import { ForgotPasswordUseCase } from '@application/usecases/auth/forgot-password.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthRecord, createMockUser } from '../../fixtures/entities';
import {
  createMockAuthRepo,
  createMockMailer,
  createMockOtpStore,
  createMockPasswordHasher,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockAuthRecord = createMockAuthRecord();
const mockUser = createMockUser();

function createMocks() {
  return {
    authRepo: createMockAuthRepo({
      findByEmail: vi.fn().mockResolvedValue(mockAuthRecord),
    }),
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(mockUser),
    }),
    hasher: createMockPasswordHasher({
      hash: vi.fn().mockResolvedValue('hashed-otp'),
    }),
    otpStore: createMockOtpStore(),
    mailer: createMockMailer(),
  };
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
    expect(result.message).toContain('reset code');
    expect(mocks.otpStore.storeOtp).toHaveBeenCalled();
    expect(mocks.mailer.sendPasswordReset).toHaveBeenCalled();
  });

  it('should not leak user existence — same message for unknown email', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(null);
    const result = await uc.execute({ email: 'unknown@example.com' });
    expect(result.message).toContain('reset code');
    expect(mocks.mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('should not leak user existence — same message for OAuth-only accounts', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(
      createMockAuthRecord({ provider: 'google', passwordHash: null }),
    );
    const result = await uc.execute({ email: 'test@example.com' });
    expect(result).toEqual({
      message: 'If this email is registered, a reset code has been sent.',
    });
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
