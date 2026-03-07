import { RedisOtpStore } from '@adapters/cache/otp.store.js';
import { redisClient } from '@adapters/cache/redis.client.js';
import { RedisTokenStore } from '@adapters/cache/token.store.js';
import { ArgonHasher } from '@adapters/crypto/argon-hasher.js';
import { DrizzleAuthRepository } from '@adapters/db/auth.repository.js';
import { db } from '@adapters/db/db.client.js';
import { DrizzleUserRepository } from '@adapters/db/user.repository.js';
import { GoogleOAuthClient } from '@adapters/external/google-oauth.client.js';
import { ResendMailer } from '@adapters/external/resend-mailer.js';
import { config } from '@config/env.js';
import { AuthController } from '@http/auth/handlers.js';
import { createAuthRouter } from '@http/auth/routes.js';
import { createRequireAuth } from '@http/middleware/auth.middleware.js';
import { ForgotPasswordUseCase } from '@usecases/auth/forgot-password.usecase.js';
import { GoogleAuthUseCase } from '@usecases/auth/google-auth.usecase.js';
import { LoginUseCase } from '@usecases/auth/login.usecase.js';
import { LogoutUseCase } from '@usecases/auth/logout.usecase.js';
import { RefreshUseCase } from '@usecases/auth/refresh.usecase.js';
import { RegisterUseCase } from '@usecases/auth/register.usecase.js';
import { ResendOtpUseCase } from '@usecases/auth/resend-otp.usecase.js';
import { ResetPasswordUseCase } from '@usecases/auth/reset-password.usecase.js';
import { TokenService } from '@usecases/auth/token.service.js';
import { VerifyOtpUseCase } from '@usecases/auth/verify-otp.usecase.js';
import type { RedisClientType } from 'redis';

// ── Adapters ────────────────────────────────────────────
const authRepo = new DrizzleAuthRepository(db);
const userRepo = new DrizzleUserRepository(db);
const tokenStore = new RedisTokenStore(redisClient as RedisClientType);
const otpStore = new RedisOtpStore(redisClient as RedisClientType);
const googleOAuth = new GoogleOAuthClient({
  googleClientId: config.googleClientId,
  googleClientSecret: config.googleClientSecret,
  googleCallbackUrl: config.googleCallbackUrl,
});
const hasher = new ArgonHasher();
const mailer = new ResendMailer(config.resendApiKey, config.resendFromAddress);
const tokenService = new TokenService(
  config.jwtSecret,
  config.jwtAccessExpiresIn,
  config.jwtRefreshExpiresIn,
);

// ── Use Cases ───────────────────────────────────────────
const registerUC = new RegisterUseCase(
  authRepo,
  userRepo,
  hasher,
  otpStore,
  mailer,
  config.otpTtlSeconds,
);
const loginUC = new LoginUseCase(authRepo, userRepo, tokenService, hasher);
const logoutUC = new LogoutUseCase(tokenStore, tokenService);
const refreshUC = new RefreshUseCase(userRepo, tokenStore, tokenService);
const googleAuthUC = new GoogleAuthUseCase(authRepo, userRepo, tokenService, googleOAuth);
const verifyOtpUC = new VerifyOtpUseCase(
  userRepo,
  tokenService,
  otpStore,
  hasher,
  config.otpMaxAttempts,
);
const resendOtpUC = new ResendOtpUseCase(userRepo, otpStore, mailer, hasher, config.otpTtlSeconds);
const forgotPasswordUC = new ForgotPasswordUseCase(
  authRepo,
  userRepo,
  hasher,
  otpStore,
  mailer,
  config.otpTtlSeconds,
);
const resetPasswordUC = new ResetPasswordUseCase(authRepo, hasher, otpStore, config.otpMaxAttempts);

// ── HTTP ────────────────────────────────────────────────
const controller = new AuthController(
  registerUC,
  loginUC,
  logoutUC,
  refreshUC,
  googleAuthUC,
  verifyOtpUC,
  resendOtpUC,
  forgotPasswordUC,
  resetPasswordUC,
  googleOAuth,
  userRepo,
  config.clientUrl,
);

const requireAuth = createRequireAuth(tokenService, tokenStore);
const authRouter = createAuthRouter(controller, requireAuth);

export { authRouter };
