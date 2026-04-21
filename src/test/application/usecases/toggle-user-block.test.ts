import { ToggleUserBlockUseCase } from '@application/usecases/admin/toggle-user-block.usecase';
import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockUser } from '../../fixtures/entities';
import { createMockUserBlockStore, createMockUserRepo } from '../../fixtures/mocks';

const activeUser = createMockUser({ id: 'u1', name: 'Alice', email: 'alice@example.com' });

function createMocks(user: IUserProfile | null = activeUser) {
  return {
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(user),
    }),
    userBlockStore: createMockUserBlockStore(),
  };
}

describe('ToggleUserBlockUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: ToggleUserBlockUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new ToggleUserBlockUseCase(mocks.userRepo, mocks.userBlockStore);
  });

  it('should block an active user and call blockUser on token store', async () => {
    const result = await uc.execute('u1');

    expect(result.isBlocked).toBe(true);
    expect(mocks.userRepo.updateBlockedStatus).toHaveBeenCalledWith('u1', true);
    expect(mocks.userBlockStore.blockUser).toHaveBeenCalledWith('u1');
    expect(mocks.userBlockStore.unblockUser).not.toHaveBeenCalled();
  });

  it('should unblock a blocked user and call unblockUser on token store', async () => {
    mocks = createMocks(createMockUser({ id: 'u1', isBlocked: true }));
    uc = new ToggleUserBlockUseCase(mocks.userRepo, mocks.userBlockStore);

    const result = await uc.execute('u1');

    expect(result.isBlocked).toBe(false);
    expect(mocks.userRepo.updateBlockedStatus).toHaveBeenCalledWith('u1', false);
    expect(mocks.userBlockStore.unblockUser).toHaveBeenCalledWith('u1');
    expect(mocks.userBlockStore.blockUser).not.toHaveBeenCalled();
  });

  it('should throw USER_NOT_FOUND when user does not exist', async () => {
    mocks = createMocks(null);
    uc = new ToggleUserBlockUseCase(mocks.userRepo, mocks.userBlockStore);

    await expect(uc.execute('ghost')).rejects.toThrow(DomainError);
    await expect(uc.execute('ghost')).rejects.toThrow('User not found');
    expect(mocks.userRepo.updateBlockedStatus).not.toHaveBeenCalled();
  });
});
