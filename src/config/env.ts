/**
 * Environment Configuration
 * Centralized environment variable access
 */

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

export const config = {
  // App
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',

  // TLS: Set ALLOW_INSECURE_TLS=true in .env for dev (e.g. Aiven self-signed certs).
  // Must NEVER be true in production — disables certificate verification.
  allowInsecureTls: getEnv('ALLOW_INSECURE_TLS', 'false') === 'true',

  // JWT (HS256)
  jwtSecret: getEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtAccessExpiresIn: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // Database (PostgreSQL)
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://user:password@localhost:5432/bingeo_identity'),

  // Redis
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),

  // Google OAuth
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
  googleCallbackUrl: getEnv('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/google/callback'),

  // Cookie
  cookieDomain: getEnv('COOKIE_DOMAIN', 'localhost'),

  // Client URL (for OAuth redirects)
  clientUrl: getEnv('CLIENT_URL', 'http://localhost:5173'),

  // Resend (email)
  resendApiKey: getEnv('RESEND_API_KEY', ''),
  resendFromAddress: getEnv('RESEND_FROM_ADDRESS', 'Bingeo <onboarding@resend.dev>'),

  // OTP
  otpTtlSeconds: getEnvNumber('OTP_TTL_SECONDS', 300), // 5 minutes
  otpMaxAttempts: getEnvNumber('OTP_MAX_ATTEMPTS', 5),
} as const;
