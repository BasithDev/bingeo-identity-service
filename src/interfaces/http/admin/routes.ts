import type { RequestHandler } from 'express';
import { Router } from 'express';
import type { AdminController } from './handlers';

export function createAdminRouter(
  controller: AdminController,
  requireAuth: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();
  router.use(requireAuth);
  router.use(requireAdmin);
  router.get('/users', controller.getUsers);
  router.post('/users/:id/toggle-block', controller.toggleBlock);

  return router;
}
