import { Router } from 'express';
import { requireAuth } from '../auth.middleware.js';
import * as handlers from './handlers.js';

export const authRouter = Router();

authRouter.get('/health', handlers.healthCheck);

// Auth — public
authRouter.post('/auth/register', handlers.registerHandler);
authRouter.post('/auth/login', handlers.loginHandler);
authRouter.post('/auth/refresh', handlers.refreshHandler);

// Auth — Google OAuth
authRouter.get('/auth/google', handlers.googleRedirectHandler);
authRouter.get('/auth/google/callback', handlers.googleCallbackHandler);

// Auth — protected
authRouter.post('/auth/logout', requireAuth, handlers.logoutHandler);
authRouter.get('/auth/me', requireAuth, handlers.getMeHandler);
