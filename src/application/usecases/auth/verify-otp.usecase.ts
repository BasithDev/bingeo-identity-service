import type { IAuthTokens } from '@application/dtos/auth.dtos';
import type { IOtpStore, IPasswordHasher, ITokenService } from '@domain/auth/ports';
import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import type { IUserRepository } from '@domain/user/ports';

interface IVerifyOtpInput {
  userId: string;
  otp: string;
}

interface IVerifyOtpResult {
  user: IUserProfile;
  tokens: IAuthTokens;
}

export interface IVerifyOtpExecutor {
  execute(input: IVerifyOtpInput): Promise<IVerifyOtpResult>;
}

export class VerifyOtpUseCase implements IVerifyOtpExecutor {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly otpStore: IOtpStore,
    private readonly hasher: IPasswordHasher,
    private readonly maxAttempts: number,
  ) {}

  async execute(input: IVerifyOtpInput): Promise<IVerifyOtpResult> {
    const { userId, otp } = input;

    const attempts = await this.otpStore.incrementAttempts(userId, 900);
    if (attempts > this.maxAttempts) {
      throw new DomainError('Too many attempts. Please request a new code.', 'OTP_MAX_ATTEMPTS');
    }

    const storedHash = await this.otpStore.getOtp(userId);
    if (!storedHash) {
      throw new DomainError(
        'Verification code has expired. Please request a new one.',
        'OTP_EXPIRED',
      );
    }

    const isValid = await this.hasher.verify(storedHash, otp);
    if (!isValid) {
      throw new DomainError('Invalid verification code', 'OTP_INVALID');
    }

    const user = await this.userRepo.verifyEmail(userId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    await this.otpStore.deleteOtp(userId);

    const tokens = this.tokenService.generateTokenPair(user);
    return { user, tokens };
  }
}
