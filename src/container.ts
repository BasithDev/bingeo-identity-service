import { redisClient } from '@adapters/cache/redis.client.js';
import { RedisTokenStore } from '@adapters/cache/token.store.js';
import { ArgonHasher } from '@adapters/crypto/argon-hasher.js';
import { DrizzleAuthRepository } from '@adapters/db/auth.repository.js';
import { db } from '@adapters/db/db.client.js';
import { DrizzleUserRepository } from '@adapters/db/user.repository.js';
import { GoogleOAuthClient } from '@adapters/external/google-oauth.client.js';
import { config } from '@config/env.js';
import { AuthController } from '@http/auth/handlers.js';
import { createAuthRouter } from '@http/auth/routes.js';
import { createRequireAuth } from '@http/middleware/auth.middleware.js';
import { GoogleAuthUseCase } from '@usecases/auth/google-auth.usecase.js';
import { JwtService } from '@usecases/auth/jwt.service.js';
import { LoginUseCase } from '@usecases/auth/login.usecase.js';
import { LogoutUseCase } from '@usecases/auth/logout.usecase.js';
import { RefreshUseCase } from '@usecases/auth/refresh.usecase.js';
import { RegisterUseCase } from '@usecases/auth/register.usecase.js';
import type { RedisClientType } from 'redis';

// ── Adapters ────────────────────────────────────────────
const authRepo = new DrizzleAuthRepository(db);
const userRepo = new DrizzleUserRepository(db);
const tokenStore = new RedisTokenStore(redisClient as RedisClientType);
const googleOAuth = new GoogleOAuthClient({
  googleClientId: config.googleClientId,
  googleClientSecret: config.googleClientSecret,
  googleCallbackUrl: config.googleCallbackUrl,
});
const hasher = new ArgonHasher();
const jwtService = new JwtService(
  config.jwtSecret,
  config.jwtAccessExpiresIn,
  config.jwtRefreshExpiresIn,
);

// ── Use Cases ───────────────────────────────────────────
const registerUC = new RegisterUseCase(authRepo, userRepo, tokenStore, jwtService, hasher);
const loginUC = new LoginUseCase(authRepo, userRepo, tokenStore, jwtService, hasher);
const logoutUC = new LogoutUseCase(tokenStore, jwtService);
const refreshUC = new RefreshUseCase(userRepo, tokenStore, jwtService);
const googleAuthUC = new GoogleAuthUseCase(authRepo, userRepo, tokenStore, jwtService, googleOAuth);

// ── HTTP ────────────────────────────────────────────────
const controller = new AuthController(
  registerUC,
  loginUC,
  logoutUC,
  refreshUC,
  googleAuthUC,
  googleOAuth,
  userRepo,
  config.clientUrl,
);

const requireAuth = createRequireAuth(jwtService, tokenStore);
const authRouter = createAuthRouter(controller, requireAuth);

export { authRouter };
