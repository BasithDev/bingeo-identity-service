import { randomInt } from 'node:crypto';
import type { IAuthRepository, IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports';
import { validateEmail } from '@domain/auth/rules';
import type { IUserRepository } from '@domain/user/ports';

const AMBIGUOUS_MESSAGE = 'If this email is registered, a reset code has been sent.';

export interface IForgotPasswordExecutor {
  execute(input: { email: string }): Promise<{ message: string }>;
}

export class ForgotPasswordUseCase implements IForgotPasswordExecutor {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly otpStore: IOtpStore,
    private readonly mailer: IMailer,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: { email: string }): Promise<{ message: string }> {
    const email = validateEmail(input.email);

    const authRecord = await this.authRepo.findByEmail(email);
    if (!authRecord || !authRecord.passwordHash) {
      return { message: AMBIGUOUS_MESSAGE };
    }

    const user = await this.userRepo.findById(authRecord.userId);
    const name = user?.name ?? 'there';

    const otp = randomInt(100_000, 999_999).toString();
    const hashedOtp = await this.hasher.hash(otp);
    await this.otpStore.storeOtp(`pwd_reset:${email}`, hashedOtp, this.otpTtlSeconds);
    await this.mailer.sendPasswordReset(email, otp, name);

    return { message: AMBIGUOUS_MESSAGE };
  }
}
