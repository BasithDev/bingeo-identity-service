import type {
  IAuthTokens,
  IGoogleUserInfo,
  IJwtAccessPayload,
  IJwtRefreshPayload,
} from '@domain/auth/types';
import type { IUserProfile } from '@domain/user/entities';
import type { IAuthCredential } from './entities';

export interface IAuthRepository {
  updatePasswordHash(userId: string, newHash: string): Promise<void>;
  findByEmail(email: string): Promise<IAuthCredential | null>;
  findByUserId(userId: string): Promise<IAuthCredential | null>;
  findByProvider(provider: string, providerId: string): Promise<IAuthCredential | null>;
  create(data: {
    userId: string;
    email: string;
    passwordHash?: string | null;
    provider: 'local' | 'google';
    providerId?: string | null;
  }): Promise<IAuthCredential>;
}
export interface ITokenStore {
  blacklistRefreshToken(jti: string, ttlSeconds: number): Promise<void>;
  isRefreshTokenBlacklisted(jti: string): Promise<boolean>;
  blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void>;
  isAccessTokenBlacklisted(jti: string): Promise<boolean>;
}

export interface IUserBlockStore {
  blockUser(userId: string): Promise<void>;
  unblockUser(userId: string): Promise<void>;
  isUserBlocked(userId: string): Promise<boolean>;
}

export interface ITokenService {
  signAccessToken(user: IUserProfile): string;
  signRefreshToken(userId: string): string;
  verifyAccessToken(token: string): IJwtAccessPayload;
  verifyRefreshToken(token: string): IJwtRefreshPayload;
  generateTokenPair(user: IUserProfile): IAuthTokens;
  getRefreshTtlSeconds(): number;
  getRemainingSeconds(token: string): number;
}

export interface IGoogleOAuthClient {
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<IGoogleUserInfo>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface IOtpStore {
  storeOtp(userId: string, hashedOtp: string, ttlSeconds: number): Promise<void>;
  getOtp(userId: string): Promise<string | null>;
  deleteOtp(userId: string): Promise<void>;
  incrementAttempts(userId: string, ttlSeconds: number): Promise<number>;
}

export interface IMailer {
  sendOtp(to: string, otp: string, name: string): Promise<void>;
  sendPasswordReset(to: string, otp: string, name: string): Promise<void>;
}

export interface IHealthChecker {
  check(): Promise<{ postgres: string; redis: string }>;
}
