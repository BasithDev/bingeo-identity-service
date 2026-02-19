import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { AuthController } from './handlers.js';

export function createAuthRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/health', controller.healthCheck);

  // Auth — public
  router.post('/auth/register', controller.register);
  router.post('/auth/login', controller.login);
  router.post('/auth/refresh', controller.refresh);

  // Auth — Google OAuth
  router.get('/auth/google', controller.googleRedirect);
  router.get('/auth/google/callback', controller.googleCallback);

  // Auth — protected
  router.post('/auth/logout', requireAuth, controller.logout);
  router.get('/auth/me', requireAuth, controller.getMe);

  return router;
}
