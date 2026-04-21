import type { IAuthRepository, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { validatePassword } from '@domain/auth/rules.js';
import { DomainError } from '@domain/shared/errors.js';

export class ResetPasswordUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly hasher: IPasswordHasher,
    private readonly otpStore: IOtpStore,
    private readonly maxAttempts: number,
  ) {}

  async execute(input: {
    userId: string;
    otp: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const { userId, otp, newPassword } = input;
    const otpKey = `pwd_reset:${userId}`;

    // Check attempts
    const attempts = await this.otpStore.incrementAttempts(otpKey, 900);
    if (attempts > this.maxAttempts) {
      throw new DomainError(
        'Too many attempts. Please request a new reset code.',
        'OTP_MAX_ATTEMPTS',
      );
    }

    // Get stored OTP
    const storedHash = await this.otpStore.getOtp(otpKey);
    if (!storedHash) {
      throw new DomainError('Reset code has expired. Please request a new one.', 'OTP_EXPIRED');
    }

    // Verify OTP
    const valid = await this.hasher.verify(storedHash, otp);
    if (!valid) {
      throw new DomainError('Invalid reset code.', 'OTP_INVALID');
    }

    // Validate new password
    const passwordResult = validatePassword(newPassword);
    if (!passwordResult.ok) {
      throw passwordResult.error;
    }

    // Hash new password and update
    const newHash = await this.hasher.hash(newPassword);
    await this.authRepo.updatePasswordHash(userId, newHash);

    // Clean up
    await this.otpStore.deleteOtp(otpKey);

    return { message: 'Password reset successfully.' };
  }
}
