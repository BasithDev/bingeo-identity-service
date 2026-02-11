/**
 * HTTP Routes
 * Route definitions and handler mapping
 */

import { Router } from 'express';
import * as handlers from './handlers.js';

export const router = Router();

router.get('/health', handlers.healthCheck);

// Add your routes here
