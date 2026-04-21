import { DomainError } from '@domain/shared/errors';
import type { IUserProfile } from '@domain/user/entities';
import type { IUserRepository } from '@domain/user/ports';

export interface IGetMeExecutor {
  execute(userId: string): Promise<IUserProfile>;
}

export class GetMeUseCase implements IGetMeExecutor {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(userId: string): Promise<IUserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }
    return user;
  }
}
