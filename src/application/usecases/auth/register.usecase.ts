import { randomInt } from 'node:crypto';
import type { IRegisterInput } from '@application/dtos/auth.dtos';
import type { IAuthRepository, IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports';
import { validateEmail, validatePassword } from '@domain/auth/rules';
import { DomainError } from '@domain/shared/errors';
import type { IUserRepository } from '@domain/user/ports';
import { validateName } from '@domain/user/rules';

export interface IRegisterExecutor {
  execute(input: IRegisterInput): Promise<{ userId: string; message: string }>;
}

interface IRegisterResult {
  userId: string;
  message: string;
}

export class RegisterUseCase implements IRegisterExecutor {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly otpStore: IOtpStore,
    private readonly mailer: IMailer,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: IRegisterInput): Promise<IRegisterResult> {
    const email = validateEmail(input.email);
    const password = validatePassword(input.password);
    const name = validateName(input.name);

    const existing = await this.authRepo.findByEmail(email);
    if (existing) {
      throw new DomainError('Email already registered', 'EMAIL_EXISTS');
    }

    const user = await this.userRepo.create({
      email,
      name,
      role: 'user',
      subscription: 'free',
    });

    const passwordHash = await this.hasher.hash(password);
    await this.authRepo.create({
      userId: user.id,
      email,
      passwordHash,
      provider: 'local',
    });

    const otp = randomInt(100_000, 999_999).toString();
    const hashedOtp = await this.hasher.hash(otp);
    await this.otpStore.storeOtp(user.id, hashedOtp, this.otpTtlSeconds);
    await this.mailer.sendOtp(email, otp, name);

    return { userId: user.id, message: 'Verification code sent to your email' };
  }
}
