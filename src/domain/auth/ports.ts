import type { GoogleUserInfo } from '../user/dtos.js';
import type { UserProfile } from '../user/entities.js';
import type { AuthTokens, JwtAccessPayload, JwtRefreshPayload } from './dtos.js';
import type { AuthCredential } from './entities.js';

export interface IAuthRepository {
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
  storeRefreshToken(userId: string, token: string, ttlSeconds: number): Promise<void>;
  getRefreshToken(userId: string): Promise<string | null>;
  deleteRefreshToken(userId: string): Promise<void>;
  deleteAllRefreshTokens(userId: string): Promise<void>;
  blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void>;
  isAccessTokenBlacklisted(jti: string): Promise<boolean>;
}

export interface IJwtService {
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
