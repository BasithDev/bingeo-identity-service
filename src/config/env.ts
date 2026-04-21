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

function parseJwtTimeToMs(timeStr: string): number {
  const match = /^(\d+)([smhd])$/.exec(timeStr);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 's') return val * 1000;
  if (unit === 'm') return val * 60 * 1000;
  if (unit === 'h') return val * 60 * 60 * 1000;
  if (unit === 'd') return val * 24 * 60 * 60 * 1000;
  return 0;
}

export const config = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  isProduction: getEnv('NODE_ENV', 'development') === 'production',
  isDevelopment: getEnv('NODE_ENV', 'development') === 'development',
  allowInsecureTls: getEnv('ALLOW_INSECURE_TLS', 'false') === 'true',
  jwtSecret: getEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  jwtAccessExpiresIn: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  get jwtAccessTtlMs() {
    return parseJwtTimeToMs(this.jwtAccessExpiresIn);
  },
  get jwtRefreshTtlMs() {
    return parseJwtTimeToMs(this.jwtRefreshExpiresIn);
  },
  databaseUrl: getEnv('DATABASE_URL', 'postgresql://user:password@localhost:5432/bingeo_identity'),
  redisUrl: getEnv('REDIS_URL', 'redis://localhost:6379'),
  googleClientId: getEnv('GOOGLE_CLIENT_ID', ''),
  googleClientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
  googleCallbackUrl: getEnv('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/google/callback'),
  cookieDomain: getEnv('COOKIE_DOMAIN', 'localhost'),
  clientUrl: getEnv('CLIENT_URL', 'http://localhost:5173'),
  resendApiKey: getEnv('RESEND_API_KEY', ''),
  resendFromAddress: getEnv('RESEND_FROM_ADDRESS', 'Bingeo <onboarding@resend.dev>'),
  otpTtlSeconds: getEnvNumber('OTP_TTL_SECONDS', 300),
  otpMaxAttempts: getEnvNumber('OTP_MAX_ATTEMPTS', 5),
} as const;
