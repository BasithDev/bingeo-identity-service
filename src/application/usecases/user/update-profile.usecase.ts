import { DomainError } from '@domain/shared/errors';
import type { IUserRepository } from '@domain/user/ports';
import { validateName } from '@domain/user/rules';

export class UpdateProfileUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: {
    userId: string;
    name: string;
    phone: string;
    avatar: string;
  }): Promise<{ userId: string; message: string }> {
    const { userId, phone, avatar } = input;
    const name = validateName(input.name);
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }
    const updatedUser = await this.userRepo.updateProfile(userId, { name, phone, avatar });
    if (!updatedUser) {
      throw new DomainError('User not found', 'USER_NOT_FOUND');
    }
    return { userId: updatedUser.id, message: 'Profile updated successfully' };
  }
}
