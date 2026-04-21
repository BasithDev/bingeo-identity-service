import { VerifyOtpUseCase } from '@application/usecases/auth/verify-otp.usecase';
import { DomainError } from '@domain/shared/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { USER_ID, createMockTokens, createMockUser } from '../../fixtures/entities';
import {
  createMockOtpStore,
  createMockPasswordHasher,
  createMockTokenService,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockUser = createMockUser();
const mockTokens = createMockTokens();

function createMocks() {
  return {
    userRepo: createMockUserRepo({
      verifyEmail: vi.fn().mockResolvedValue(mockUser),
    }),
    tokenService: createMockTokenService({
      generateTokenPair: vi.fn().mockReturnValue(mockTokens),
    }),
    otpStore: createMockOtpStore({
      getOtp: vi.fn().mockResolvedValue('stored-hash'),
      incrementAttempts: vi.fn().mockResolvedValue(1),
    }),
    hasher: createMockPasswordHasher({
      verify: vi.fn().mockResolvedValue(true),
    }),
  };
}

describe('VerifyOtpUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: VerifyOtpUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new VerifyOtpUseCase(mocks.userRepo, mocks.tokenService, mocks.otpStore, mocks.hasher, 5);
  });

  it('should verify OTP and return user + tokens', async () => {
    const result = await uc.execute({ userId: USER_ID, otp: '123456' });
    expect(result.user).toEqual(mockUser);
    expect(result.tokens).toEqual(mockTokens);
    expect(mocks.userRepo.verifyEmail).toHaveBeenCalledWith(USER_ID);
    expect(mocks.otpStore.deleteOtp).toHaveBeenCalledWith(USER_ID);
  });

  it('should throw OTP_MAX_ATTEMPTS', async () => {
    vi.mocked(mocks.otpStore.incrementAttempts).mockResolvedValue(6);
    await expect(uc.execute({ userId: USER_ID, otp: '123456' })).rejects.toThrow(DomainError);
  });

  it('should throw OTP_EXPIRED when no stored OTP', async () => {
    vi.mocked(mocks.otpStore.getOtp).mockResolvedValue(null);
    await expect(uc.execute({ userId: USER_ID, otp: '123456' })).rejects.toThrow(DomainError);
  });

  it('should throw OTP_INVALID when wrong code', async () => {
    vi.mocked(mocks.hasher.verify).mockResolvedValue(false);
    await expect(uc.execute({ userId: USER_ID, otp: 'wrong' })).rejects.toThrow(DomainError);
  });

  it('should throw USER_NOT_FOUND when verifyEmail returns null', async () => {
    vi.mocked(mocks.userRepo.verifyEmail).mockResolvedValue(null);
    await expect(uc.execute({ userId: USER_ID, otp: '123456' })).rejects.toThrow(DomainError);
  });
});
