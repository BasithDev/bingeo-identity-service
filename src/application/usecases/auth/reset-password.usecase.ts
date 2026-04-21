import type { IAuthRepository, IOtpStore, IPasswordHasher } from '@domain/auth/ports';
import { validateEmail, validatePassword } from '@domain/auth/rules';
import { DomainError } from '@domain/shared/errors';

export interface IResetPasswordExecutor {
  execute(input: { email: string; otp: string; newPassword: string }): Promise<{ message: string }>;
}

export class ResetPasswordUseCase implements IResetPasswordExecutor {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly hasher: IPasswordHasher,
    private readonly otpStore: IOtpStore,
    private readonly maxAttempts: number,
  ) {}

  async execute(input: {
    email: string;
    otp: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const email = validateEmail(input.email);
    const { otp, newPassword } = input;

    const otpKey = `pwd_reset:${email}`;
    const attempts = await this.otpStore.incrementAttempts(otpKey, 900);
    if (attempts > this.maxAttempts) {
      throw new DomainError(
        'Too many attempts. Please request a new reset code.',
        'OTP_MAX_ATTEMPTS',
      );
    }

    const storedHash = await this.otpStore.getOtp(otpKey);
    if (!storedHash) {
      throw new DomainError('Reset code has expired. Please request a new one.', 'OTP_EXPIRED');
    }

    const valid = await this.hasher.verify(storedHash, otp);
    if (!valid) {
      throw new DomainError('Invalid reset code.', 'OTP_INVALID');
    }

    validatePassword(newPassword);

    const authRecord = await this.authRepo.findByEmail(email);
    if (!authRecord) {
      throw new DomainError('Invalid reset request', 'INVALID_RESET');
    }

    const newHash = await this.hasher.hash(newPassword);
    await this.authRepo.updatePasswordHash(authRecord.userId, newHash);
    await this.otpStore.deleteOtp(otpKey);

    return { message: 'Password reset successfully.' };
  }
}
