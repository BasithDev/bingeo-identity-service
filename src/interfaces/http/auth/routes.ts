import type { RequestHandler } from 'express';
import { Router } from 'express';
import { authRateLimiter } from '../middleware/rate-limit.middleware';
import type { AuthController } from './handlers';

export function createAuthRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.get('/health', controller.healthCheck);
  router.use(authRateLimiter);
  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/verify-otp', controller.verifyOtp);
  router.post('/resend-otp', controller.resendOtp);
  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);
  router.get('/google', controller.googleRedirect);
  router.get('/google/callback', controller.googleCallback);
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.getMe);

  return router;
}
