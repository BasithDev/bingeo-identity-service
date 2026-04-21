import type {
  IAuthRepository,
  IGoogleOAuthClient,
  IMailer,
  IOtpStore,
  IPasswordHasher,
  ITokenService,
  ITokenStore,
  IUserBlockStore,
} from '@domain/auth/ports';
import type { IUserRepository } from '@domain/user/ports';
import { vi } from 'vitest';

export function createMockAuthRepo(
  overrides: Partial<IAuthRepository> = {},
): IAuthRepository {
  return {
    findByEmail: vi.fn(),
    findByUserId: vi.fn(),
    findByProvider: vi.fn(),
    create: vi.fn(),
    updatePasswordHash: vi.fn(),
    ...overrides,
  };
}

export function createMockUserRepo(
  overrides: Partial<IUserRepository> = {},
): IUserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateSubscription: vi.fn(),
    updateProfile: vi.fn(),
    verifyEmail: vi.fn(),
    updateBlockedStatus: vi.fn(),
    findUsers: vi.fn(),
    ...overrides,
  };
}

export function createMockTokenService(
  overrides: Partial<ITokenService> = {},
): ITokenService {
  return {
    signAccessToken: vi.fn(),
    signRefreshToken: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    generateTokenPair: vi.fn(),
    getRefreshTtlSeconds: vi.fn(),
    getRemainingSeconds: vi.fn(),
    ...overrides,
  };
}

export function createMockPasswordHasher(
  overrides: Partial<IPasswordHasher> = {},
): IPasswordHasher {
  return {
    hash: vi.fn(),
    verify: vi.fn(),
    ...overrides,
  };
}

export function createMockOtpStore(
  overrides: Partial<IOtpStore> = {},
): IOtpStore {
  return {
    storeOtp: vi.fn(),
    getOtp: vi.fn(),
    deleteOtp: vi.fn(),
    incrementAttempts: vi.fn(),
    ...overrides,
  };
}

export function createMockMailer(
  overrides: Partial<IMailer> = {},
): IMailer {
  return {
    sendOtp: vi.fn(),
    sendPasswordReset: vi.fn(),
    ...overrides,
  };
}

export function createMockTokenStore(
  overrides: Partial<ITokenStore> = {},
): ITokenStore {
  return {
    blacklistRefreshToken: vi.fn(),
    isRefreshTokenBlacklisted: vi.fn().mockResolvedValue(false),
    blacklistAccessToken: vi.fn(),
    isAccessTokenBlacklisted: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

export function createMockUserBlockStore(
  overrides: Partial<IUserBlockStore> = {},
): IUserBlockStore {
  return {
    blockUser: vi.fn(),
    unblockUser: vi.fn(),
    isUserBlocked: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

export function createMockGoogleOAuth(
  overrides: Partial<IGoogleOAuthClient> = {},
): IGoogleOAuthClient {
  return {
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    ...overrides,
  };
}
