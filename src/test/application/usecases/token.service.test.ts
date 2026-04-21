import { JwtTokenProvider } from '@adapters/crypto/jwt-token-provider';
import { describe, expect, it } from 'vitest';
import { createMockUser } from '../../fixtures/entities';

const tokenService = new JwtTokenProvider('test-secret-key-for-unit-tests', '15m', '7d');
const mockUser = createMockUser({ id: 'user-123', name: 'Test User' });

describe('TokenService', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('should sign and verify an access token', () => {
      const token = tokenService.signAccessToken(mockUser);
      expect(typeof token).toBe('string');

      const payload = tokenService.verifyAccessToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.name).toBe('Test User');
      expect(payload.role).toBe('user');
      expect(payload.jti).toBeDefined();
      expect(payload.typ).toBe('access');
    });

    it('should throw on invalid token', () => {
      expect(() => tokenService.verifyAccessToken('invalid-token')).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('should sign and verify a refresh token', () => {
      const token = tokenService.signRefreshToken('user-123');
      const payload = tokenService.verifyRefreshToken(token);
      expect(payload.sub).toBe('user-123');
      expect(payload.jti).toBeDefined();
      expect(payload.typ).toBe('refresh');
    });

    it('should throw on invalid token', () => {
      expect(() => tokenService.verifyRefreshToken('bad-token')).toThrow();
    });
  });

  describe('generateTokenPair', () => {
    it('should return access and refresh tokens', () => {
      const pair = tokenService.generateTokenPair(mockUser);
      expect(pair.accessToken).toBeDefined();
      expect(pair.refreshToken).toBeDefined();

      const access = tokenService.verifyAccessToken(pair.accessToken);
      expect(access.sub).toBe('user-123');

      const refresh = tokenService.verifyRefreshToken(pair.refreshToken);
      expect(refresh.sub).toBe('user-123');
    });
  });

  describe('getRefreshTtlSeconds', () => {
    it('should parse 7d correctly', () => {
      expect(tokenService.getRefreshTtlSeconds()).toBe(7 * 24 * 60 * 60);
    });

    it('should parse hours (h)', () => {
      const svc = new JwtTokenProvider('secret', '15m', '2h');
      expect(svc.getRefreshTtlSeconds()).toBe(2 * 60 * 60);
    });

    it('should parse minutes (m)', () => {
      const svc = new JwtTokenProvider('secret', '15m', '30m');
      expect(svc.getRefreshTtlSeconds()).toBe(30 * 60);
    });

    it('should parse seconds (s)', () => {
      const svc = new JwtTokenProvider('secret', '15m', '90s');
      expect(svc.getRefreshTtlSeconds()).toBe(90);
    });

    it('should return default (7d) for unrecognised format', () => {
      const svc = new JwtTokenProvider('secret', '15m', 'invalid');
      expect(svc.getRefreshTtlSeconds()).toBe(7 * 24 * 60 * 60);
    });
  });

  describe('getRemainingSeconds', () => {
    it('should return remaining seconds for a valid token', () => {
      const token = tokenService.signAccessToken(mockUser);
      const remaining = tokenService.getRemainingSeconds(token);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(15 * 60);
    });

    it('should return 0 for invalid token', () => {
      expect(tokenService.getRemainingSeconds('garbage')).toBe(0);
    });
  });
});
