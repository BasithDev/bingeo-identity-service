import type { AuthTokens } from '@domain/auth/dtos.js';
import type { IOtpStore, IPasswordHasher, ITokenService } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';

interface VerifyOtpInput {
  userId: string;
  otp: string;
}

interface VerifyOtpResult {
  user: UserProfile;
  tokens: AuthTokens;
}

export class VerifyOtpUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly otpStore: IOtpStore,
    private readonly hasher: IPasswordHasher,
    private readonly maxAttempts: number,
  ) {}

  async execute(input: VerifyOtpInput): Promise<VerifyOtpResult> {
    const { userId, otp } = input;

    // Check attempts (15 min TTL for attempts counter)
    const attempts = await this.otpStore.incrementAttempts(userId, 900);
    if (attempts > this.maxAttempts) {
      throw new DomainError('Too many attempts. Please request a new code.', 'OTP_MAX_ATTEMPTS');
    }

    // Check if OTP exists
    const storedHash = await this.otpStore.getOtp(userId);
    if (!storedHash) {
      throw new DomainError(
        'Verification code has expired. Please request a new one.',
        'OTP_EXPIRED',
      );
    }

    // Verify OTP
    const isValid = await this.hasher.verify(storedHash, otp);
    if (!isValid) {
      throw new DomainError('Invalid verification code', 'OTP_INVALID');
    }

    // Mark email as verified
    const user = await this.userRepo.verifyEmail(userId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    // Clean up OTP data
    await this.otpStore.deleteOtp(userId);

    // Issue tokens
    const tokens = this.tokenService.generateTokenPair(user);
    return { user, tokens };
  }
}
