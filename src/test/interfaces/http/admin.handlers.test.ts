import type { GetUsersUseCase } from '@application/usecases/admin/get-users.usecase';
import type { ToggleUserBlockUseCase } from '@application/usecases/admin/toggle-user-block.usecase';
import { DomainError } from '@domain/shared/errors';
import { AdminController } from '@interfaces/http/admin/handlers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockReq, createMockRes } from '../../fixtures/http';

vi.mock('../../../shared/logger.js', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockUsersResult = {
  total: 2,
  data: [
    {
      id: 'u1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'user' as const,
      emailVerified: true,
      isBlocked: false,
      avatar: null,
      joinedAt: new Date().toISOString(),
      plan: 'free' as const,
      phone: 'N/A',
      age: 0,
      totalWatchHours: 0,
      totalPaid: 0,
    },
  ],
};

function createController() {
  const getUsersUC = {
    execute: vi.fn().mockResolvedValue(mockUsersResult),
  } as unknown as GetUsersUseCase;

  const toggleUserBlockUC = {
    execute: vi.fn().mockResolvedValue({ isBlocked: true }),
  } as unknown as ToggleUserBlockUseCase;

  const controller = new AdminController(getUsersUC, toggleUserBlockUC);
  return { controller, getUsersUC, toggleUserBlockUC };
}

describe('AdminController', () => {
  let ctx: ReturnType<typeof createController>;

  beforeEach(() => {
    ctx = createController();
  });

  describe('getUsers', () => {
    it('should return users with 200', async () => {
      const req = createMockReq({
        query: { page: '1', pageSize: '10', sortBy: 'joinedAt', sortDir: 'desc' },
      });
      const res = createMockRes();

      await ctx.controller.getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }));
    });

    it('should throw on truly invalid query params (bad enum)', async () => {
      const req = createMockReq({ query: { sortDir: 'invalid' } });
      const res = createMockRes();

      await expect(ctx.controller.getUsers(req, res)).rejects.toThrow();
      expect(ctx.getUsersUC.execute).not.toHaveBeenCalled();
    });
  });

  describe('toggleBlock', () => {
    it('should block a user and return isBlocked true', async () => {
      const req = createMockReq({
        params: { id: 'u1' },
        query: { page: '1', pageSize: '10', sortBy: 'joinedAt', sortDir: 'desc' },
      });
      const res = createMockRes();

      await ctx.controller.toggleBlock(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isBlocked: true, message: 'User blocked successfully' }),
      );
    });

    it('should unblock a user and return isBlocked false', async () => {
      vi.mocked(ctx.toggleUserBlockUC.execute).mockResolvedValue({ isBlocked: false });
      const req = createMockReq({ params: { id: 'u1' } });
      const res = createMockRes();

      await ctx.controller.toggleBlock(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ isBlocked: false, message: 'User unblocked successfully' }),
      );
    });

    it('should propagate DomainError when user not found', async () => {
      vi.mocked(ctx.toggleUserBlockUC.execute).mockRejectedValue(
        new DomainError('User not found', 'USER_NOT_FOUND'),
      );
      const req = createMockReq({ params: { id: 'ghost' } });
      const res = createMockRes();

      await expect(ctx.controller.toggleBlock(req, res)).rejects.toThrow('User not found');
    });
  });
});
