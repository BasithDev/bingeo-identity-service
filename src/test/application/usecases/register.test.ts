import { RegisterUseCase } from '@application/usecases/auth/register.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockAuthRecord, createMockUser } from '../../fixtures/entities';
import {
  createMockAuthRepo,
  createMockMailer,
  createMockOtpStore,
  createMockPasswordHasher,
  createMockUserRepo,
} from '../../fixtures/mocks';

const mockUser = createMockUser({ emailVerified: false });

function createMocks() {
  return {
    authRepo: createMockAuthRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(createMockAuthRecord()),
    }),
    userRepo: createMockUserRepo({
      create: vi.fn().mockResolvedValue(mockUser),
    }),
    hasher: createMockPasswordHasher({
      hash: vi.fn().mockResolvedValue('hashed-password'),
    }),
    otpStore: createMockOtpStore(),
    mailer: createMockMailer(),
  };
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

    expect(result.userId).toBe(mockUser.id);
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
    vi.mocked(mocks.authRepo.findByEmail).mockResolvedValue(createMockAuthRecord());

    await expect(
      useCase.execute({ email: 'test@example.com', password: 'Test1234', name: 'Test' }),
    ).rejects.toThrow('Email already registered');
  });
});
