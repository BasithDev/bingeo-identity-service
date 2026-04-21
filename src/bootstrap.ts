import { JwtTokenProvider } from '@adapters/crypto/jwt-token-provider';
import { RedisTokenCache } from '@adapters/cache/token.cache';
import { AdminController } from '@interfaces/http/admin/handlers';
import { createAdminRouter } from '@interfaces/http/admin/routes';
import { AuthController } from '@interfaces/http/auth/handlers';
import { createAuthRouter } from '@interfaces/http/auth/routes';
import { createRequireAuth, requireAdmin } from '@interfaces/http/middleware/auth.middleware';
import { Router } from 'express';
import { container } from './container';

const authRouter = createAuthRouter(
  container.resolve<AuthController>('controller'),
  createRequireAuth(
    container.resolve<JwtTokenProvider>('tokenService'),
    container.resolve<RedisTokenCache>('tokenStore'),
    container.resolve<RedisTokenCache>('userBlockStore'),
  ),
);

const adminRouter = createAdminRouter(
  container.resolve<AdminController>('adminController'),
  createRequireAuth(
    container.resolve<JwtTokenProvider>('tokenService'),
    container.resolve<RedisTokenCache>('tokenStore'),
    container.resolve<RedisTokenCache>('userBlockStore'),
  ),
  requireAdmin,
);

const apiRouter = Router();
apiRouter.use('/auth', authRouter);
apiRouter.use('/admin', adminRouter);

export { apiRouter };
