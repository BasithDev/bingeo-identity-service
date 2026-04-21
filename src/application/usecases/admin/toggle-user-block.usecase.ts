import type { IUserBlockStore } from '@domain/auth/ports';
import { DomainError } from '@domain/shared/errors';
import type { IUserRepository } from '@domain/user/ports';

export interface IToggleUserBlockExecutor {
  execute(userId: string): Promise<{ isBlocked: boolean }>;
}

export class ToggleUserBlockUseCase implements IToggleUserBlockExecutor {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly userBlockStore: IUserBlockStore,
  ) {}

  async execute(userId: string): Promise<{ isBlocked: boolean }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }

    const newStatus = !user.isBlocked;
    await this.userRepo.updateBlockedStatus(userId, newStatus);
    if (newStatus) {
      await this.userBlockStore.blockUser(userId);
    } else {
      await this.userBlockStore.unblockUser(userId);
    }

    return { isBlocked: newStatus };
  }
}
