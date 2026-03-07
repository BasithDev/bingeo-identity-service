import type { GoogleUserInfo } from '../user/dtos.js';
import type { UserProfile } from '../user/entities.js';
import type { AuthTokens, JwtAccessPayload, JwtRefreshPayload } from './dtos.js';
import type { AuthCredential } from './entities.js';

export interface IAuthRepository {
  updatePasswordHash(userId: string, newHash: string): Promise<void>;
  findByEmail(email: string): Promise<AuthCredential | null>;
  findByUserId(userId: string): Promise<AuthCredential | null>;
  findByProvider(provider: string, providerId: string): Promise<AuthCredential | null>;
  create(data: {
    userId: string;
    email: string;
    passwordHash?: string | null;
    provider: string;
    providerId?: string | null;
  }): Promise<AuthCredential>;
}

export interface ITokenStore {
  // Refresh token blacklist (by jti)
  blacklistRefreshToken(jti: string, ttlSeconds: number): Promise<void>;
  isRefreshTokenBlacklisted(jti: string): Promise<boolean>;
  // Access token blacklist (by jti) — used on logout to immediately invalidate
  blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void>;
  isAccessTokenBlacklisted(jti: string): Promise<boolean>;
}

export interface ITokenService {
  signAccessToken(user: UserProfile): string;
  signRefreshToken(userId: string): string;
  verifyAccessToken(token: string): JwtAccessPayload;
  verifyRefreshToken(token: string): JwtRefreshPayload;
  generateTokenPair(user: UserProfile): AuthTokens;
  getRefreshTtlSeconds(): number;
  getRemainingSeconds(token: string): number;
}

export interface IGoogleOAuthClient {
  getAuthUrl(): string;
  exchangeCode(code: string): Promise<GoogleUserInfo>;
}

export interface IPasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
}

export interface IOtpStore {
  /** Store a hashed OTP with TTL */
  storeOtp(userId: string, hashedOtp: string, ttlSeconds: number): Promise<void>;
  /** Get the stored hashed OTP */
  getOtp(userId: string): Promise<string | null>;
  /** Delete OTP after successful verification */
  deleteOtp(userId: string): Promise<void>;
  /** Increment and return the verification attempt count */
  incrementAttempts(userId: string, ttlSeconds: number): Promise<number>;
}

export interface IMailer {
  sendOtp(to: string, otp: string, name: string): Promise<void>;
  sendPasswordReset(to: string, otp: string, name: string): Promise<void>;
}
