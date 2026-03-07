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

  // OTP — public
  router.post('/auth/verify-otp', controller.verifyOtp);
  router.post('/auth/resend-otp', controller.resendOtp);

  // Password reset — public
  router.post('/auth/forgot-password', controller.forgotPassword);
  router.post('/auth/reset-password', controller.resetPassword);
  router.get('/auth/google', controller.googleRedirect);
  router.get('/auth/google/callback', controller.googleCallback);

  // Auth — protected
  router.post('/auth/logout', requireAuth, controller.logout);
  router.get('/auth/me', requireAuth, controller.getMe);

  return router;
}
