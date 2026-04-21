import { RedisOtpCache } from '@adapters/cache/otp.cache';
import { redisClient } from '@adapters/cache/redis.client';
import { RedisTokenCache } from '@adapters/cache/token.cache';
import { ArgonHasher } from '@adapters/crypto/argon-hasher';
import { JwtTokenProvider } from '@adapters/crypto/jwt-token-provider';
import { db } from '@adapters/db/client/db.client';
import { pool } from '@adapters/db/client/db.client';
import { DrizzleAuthRepository } from '@adapters/db/repositories/auth.repository';
import { DrizzleUserRepository } from '@adapters/db/repositories/user.repository';
import { GoogleOAuthClient } from '@adapters/external/google-oauth.client';
import { ResendMailer } from '@adapters/external/resend-mailer';
import { InfraHealthChecker } from '@adapters/infra/health-checker';
import { GetUsersUseCase } from '@application/usecases/admin/get-users.usecase';
import { ToggleUserBlockUseCase } from '@application/usecases/admin/toggle-user-block.usecase';
import { ForgotPasswordUseCase } from '@application/usecases/auth/forgot-password.usecase';
import { GoogleAuthUseCase } from '@application/usecases/auth/google-auth.usecase';
import { LoginUseCase } from '@application/usecases/auth/login.usecase';
import { LogoutUseCase } from '@application/usecases/auth/logout.usecase';
import { RefreshUseCase } from '@application/usecases/auth/refresh.usecase';
import { RegisterUseCase } from '@application/usecases/auth/register.usecase';
import { ResendOtpUseCase } from '@application/usecases/auth/resend-otp.usecase';
import { ResetPasswordUseCase } from '@application/usecases/auth/reset-password.usecase';
import { VerifyOtpUseCase } from '@application/usecases/auth/verify-otp.usecase';
import { HealthCheckUseCase } from '@application/usecases/health-check.usecase';
import { GetMeUseCase } from '@application/usecases/user/get-me.usecase';
import { UpdateProfileUseCase } from '@application/usecases/user/update-profile.usecase';
import { config } from '@config/env';
import { AdminController } from '@interfaces/http/admin/handlers';
import { AuthController } from '@interfaces/http/auth/handlers';
import { asClass, asValue, createContainer, InjectionMode } from 'awilix';
import type { RedisClientType } from 'redis';

const container = createContainer({
  injectionMode: InjectionMode.CLASSIC,
});

const tokenCache = new RedisTokenCache(redisClient as RedisClientType);

container.register({
  otpTtlSeconds: asValue(config.otpTtlSeconds),
  maxAttempts: asValue(config.otpMaxAttempts),
  clientUrl: asValue(config.clientUrl),

  authRepo: asValue(new DrizzleAuthRepository(db)),
  userRepo: asValue(new DrizzleUserRepository(db)),
  tokenStore: asValue(tokenCache),
  userBlockStore: asValue(tokenCache),
  otpStore: asValue(new RedisOtpCache(redisClient as RedisClientType)),
  hasher: asValue(new ArgonHasher()),
  googleOAuth: asValue(
    new GoogleOAuthClient({
      googleClientId: config.googleClientId,
      googleClientSecret: config.googleClientSecret,
      googleCallbackUrl: config.googleCallbackUrl,
    }),
  ),
  mailer: asValue(
    new ResendMailer(config.resendApiKey, config.resendFromAddress, config.otpTtlSeconds),
  ),
  tokenService: asValue(
    new JwtTokenProvider(config.jwtSecret, config.jwtAccessExpiresIn, config.jwtRefreshExpiresIn),
  ),
  healthChecker: asValue(new InfraHealthChecker(pool, redisClient as RedisClientType)),

  registerUC: asClass(RegisterUseCase).singleton(),
  loginUC: asClass(LoginUseCase).singleton(),
  logoutUC: asClass(LogoutUseCase).singleton(),
  refreshUC: asClass(RefreshUseCase).singleton(),
  googleAuthUC: asClass(GoogleAuthUseCase).singleton(),
  verifyOtpUC: asClass(VerifyOtpUseCase).singleton(),
  resendOtpUC: asClass(ResendOtpUseCase).singleton(),
  forgotPasswordUC: asClass(ForgotPasswordUseCase).singleton(),
  resetPasswordUC: asClass(ResetPasswordUseCase).singleton(),
  healthCheckUC: asClass(HealthCheckUseCase).singleton(),

  getMeUC: asClass(GetMeUseCase).singleton(),
  updateProfileUC: asClass(UpdateProfileUseCase).singleton(),

  getUsersUC: asClass(GetUsersUseCase).singleton(),
  toggleUserBlockUC: asClass(ToggleUserBlockUseCase).singleton(),

  controller: asClass(AuthController).singleton(),
  adminController: asClass(AdminController).singleton(),
});

export { container };
