import type { IAuthRepository, IMailer, IOtpStore, IPasswordHasher } from '@domain/auth/ports.js';
import type { UserProfile } from '@domain/user/entities.js';
import type { IUserRepository } from '@domain/user/ports.js';
import { RegisterUseCase } from '@usecases/auth/register.usecase.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUser: UserProfile = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test',
  role: 'user',
  subscription: 'free',
  emailVerified: false,
  phone: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMocks() {
  const authRepo: IAuthRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn(),
    findByProvider: vi.fn(),
    updatePasswordHash: vi.fn(),
    create: vi.fn().mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      provider: 'local',
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  };

  const userRepo: IUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn().mockResolvedValue(mockUser),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
  };

  const hasher: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue('hashed-password'),
    verify: vi.fn(),
  };

  const otpStore: IOtpStore = {
    storeOtp: vi.fn(),
    getOtp: vi.fn(),
    deleteOtp: vi.fn(),
    incrementAttempts: vi.fn(),
  };

  const mailer: IMailer = {
    sendOtp: vi.fn(),
    sendPasswordReset: vi.fn(),
  };

  return { authRepo, userRepo, hasher, otpStore, mailer };
}

describe('RegisterUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    mocks = createMocks();
    useCase = new RegisterUseCase(
      mocks.authRepo,
      mocks.userRepo,
      mocks.hasher,
      mocks.otpStore,
      mocks.mailer,
      600,
    );
  });

  it('should register a new user and send OTP', async () => {
    const result = await useCase.execute({
      email: 'test@example.com',
      password: 'Test1234',
      name: 'Test',
    });

    expect(result.userId).toBe('user-1');
    expect(result.message).toContain('Verification');
    expect(mocks.userRepo.create).toHaveBeenCalled();
    expect(mocks.authRepo.create).toHaveBeenCalled();
    expect(mocks.otpStore.storeOtp).toHaveBeenCalled();
    expect(mocks.mailer.sendOtp).toHaveBeenCalled();
  });

  it('should throw on invalid email', async () => {
    await expect(
      useCase.execute({ email: '', password: 'Test1234', name: 'Test' }),
    ).rejects.toThrow();
  });

  it('should throw on weak password', async () => {
    await expect(
      useCase.execute({ email: 'a@b.com', password: 'short', name: 'Test' }),
    ).rejects.toThrow();
  });

  it('should throw on invalid name', async () => {
    await expect(
      useCase.execute({ email: 'a@b.com', password: 'Test1234', name: '' }),
    ).rejects.toThrow();
  });

  it('should throw if email already exists', async () => {
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue({
      id: 'auth-1',
      userId: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashed',
      provider: 'local' as const,
      providerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'Test1234', name: 'Test' }),
    ).rejects.toThrow('Email already registered');
  });
});
