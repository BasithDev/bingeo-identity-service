import { randomInt } from 'node:crypto';
import type { RegisterInput } from '@domain/auth/dtos.js';
import type { IAuthRepository, IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import { validateEmail, validatePassword } from '@domain/auth/rules.js';
import { DomainError } from '@domain/shared/errors.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { validateName } from '@domain/user/rules.js';

interface RegisterResult {
  userId: string;
  message: string;
}

export class RegisterUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly otpStore: IOtpStore,
    private readonly mailer: IMailer,
    private readonly otpTtlSeconds: number,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterResult> {
    const emailResult = validateEmail(input.email);
    if (!emailResult.ok) throw emailResult.error;

    const passwordResult = validatePassword(input.password);
    if (!passwordResult.ok) throw passwordResult.error;

    const nameResult = validateName(input.name);
    if (!nameResult.ok) throw nameResult.error;

    const existing = await this.authRepo.findByEmail(emailResult.value);
    if (existing) {
      throw new DomainError('Email already registered', 'EMAIL_EXISTS');
    }

    const user = await this.userRepo.create({
      email: emailResult.value,
      name: nameResult.value,
      role: 'user',
      subscription: 'free',
    });

    const passwordHash = await this.hasher.hash(input.password);
    await this.authRepo.create({
      userId: user.id,
      email: emailResult.value,
      passwordHash,
      provider: 'local',
    });

    // Generate 6-digit OTP, hash it, store in Redis, and send via email
    const otp = randomInt(100_000, 999_999).toString();
    const hashedOtp = await this.hasher.hash(otp);
    await this.otpStore.storeOtp(user.id, hashedOtp, this.otpTtlSeconds);
    await this.mailer.sendOtp(emailResult.value, otp, nameResult.value);

    return { userId: user.id, message: 'Verification code sent to your email' };
  }
}
