import { randomInt } from 'node:crypto';
import type { IAuthRepository, IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { DomainError } from '@domain/shared/errors.js';
import type { IUserRepository } from '@domain/user/ports.js';

export class ForgotPasswordUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly otpStore: IOtpStore,
    private readonly mailer: IMailer,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: { email: string }): Promise<{ userId: string; message: string }> {
    const { email } = input;

    // Check auth record exists
    const authRecord = await this.authRepo.findByEmail(email);
    if (!authRecord) {
      // Return generic message to prevent email enumeration
      return { userId: '', message: 'If this email is registered, a reset code has been sent.' };
    }

    // Must have a password (not OAuth-only)
    if (!authRecord.passwordHash) {
      throw new DomainError(
        'This account uses Google sign-in. Please login with Google.',
        'OAUTH_ACCOUNT',
      );
    }

    // Look up user for their name
    const user = await this.userRepo.findById(authRecord.userId);
    const name = user?.name ?? 'there';

    // Generate & store OTP
    const otp = randomInt(100_000, 999_999).toString();
    const hashedOtp = await this.hasher.hash(otp);
    await this.otpStore.storeOtp(`pwd_reset:${authRecord.userId}`, hashedOtp, this.otpTtlSeconds);

    // Send email
    await this.mailer.sendPasswordReset(email, otp, name);

    return {
      userId: authRecord.userId,
      message: 'If this email is registered, a reset code has been sent.',
    };
  }
}
