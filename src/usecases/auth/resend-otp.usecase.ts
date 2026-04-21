import { randomInt } from 'node:crypto';
import type { IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { IUserRepository } from '@domain/user/ports.js';

interface ResendOtpInput {
  userId: string;
}

export class ResendOtpUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly otpStore: IOtpStore,
    private readonly mailer: IMailer,
    private readonly hasher: IPasswordHasher,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: ResendOtpInput): Promise<{ message: string }> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    if (user.emailVerified) {
      throw new DomainError('Email is already verified', 'ALREADY_VERIFIED');
    }

    // Generate new OTP
    const otp = randomInt(100_000, 999_999).toString();
    const hashedOtp = await this.hasher.hash(otp);
    await this.otpStore.storeOtp(user.id, hashedOtp, this.otpTtlSeconds);
    await this.mailer.sendOtp(user.email, otp, user.name);

    return { message: 'New verification code sent' };
  }
}
