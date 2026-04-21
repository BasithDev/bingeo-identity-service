import type { IOtpStore, IPasswordHasher, ITokenService } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { VerifyOtpUseCase } from '@usecases/auth/verify-otp.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const mockTokens = { accessToken: 'at', refreshToken: 'rt' };

function createMocks() {
  const userRepo: IUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn().mockResolvedValue(mockUser),
  };
  const tokenService: ITokenService = {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    generateTokenPair: vi.fn().mockReturnValue(mockTokens),
    getRefreshTtlSeconds: vi.fn(),
    getRemainingSeconds: vi.fn(),
  };
  const otpStore: IOtpStore = {
    storeOtp: vi.fn(),
    getOtp: vi.fn().mockResolvedValue('stored-hash'),
    deleteOtp: vi.fn(),
    incrementAttempts: vi.fn().mockResolvedValue(1),
  };
  const hasher: IPasswordHasher = {
    hash: vi.fn(),
    verify: vi.fn().mockResolvedValue(true),
  };

  return { userRepo, tokenService, otpStore, hasher };
}

describe('VerifyOtpUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: VerifyOtpUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new VerifyOtpUseCase(mocks.userRepo, mocks.tokenService, mocks.otpStore, mocks.hasher, 5);
  });

  it('should verify OTP and return user + tokens', async () => {
    const result = await uc.execute({ userId: 'user-1', otp: '123456' });
    expect(result.user).toEqual(mockUser);
    expect(result.tokens).toEqual(mockTokens);
    expect(mocks.userRepo.verifyEmail).toHaveBeenCalledWith('user-1');
    expect(mocks.otpStore.deleteOtp).toHaveBeenCalledWith('user-1');
  });

  it('should throw OTP_MAX_ATTEMPTS', async () => {
    vi.mocked(mocks.otpStore.incrementAttempts).mockResolvedValue(6);
    await expect(uc.execute({ userId: 'user-1', otp: '123456' })).rejects.toThrow(DomainError);
  });

  it('should throw OTP_EXPIRED when no stored OTP', async () => {
    vi.mocked(mocks.otpStore.getOtp).mockResolvedValue(null);
    await expect(uc.execute({ userId: 'user-1', otp: '123456' })).rejects.toThrow(DomainError);
  });

  it('should throw OTP_INVALID when wrong code', async () => {
    vi.mocked(mocks.hasher.verify).mockResolvedValue(false);
    await expect(uc.execute({ userId: 'user-1', otp: 'wrong' })).rejects.toThrow(DomainError);
  });

  it('should throw USER_NOT_FOUND when verifyEmail returns null', async () => {
    vi.mocked(mocks.userRepo.verifyEmail).mockResolvedValue(null);
    await expect(uc.execute({ userId: 'user-1', otp: '123456' })).rejects.toThrow(DomainError);
  });
});
