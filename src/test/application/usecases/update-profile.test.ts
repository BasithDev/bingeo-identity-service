import { UpdateProfileUseCase } from '@application/usecases/user/update-profile.usecase';
import { DomainError } from '@domain/shared/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockUser } from '../../fixtures/entities';
import { createMockUserRepo } from '../../fixtures/mocks';

const mockUser = createMockUser({ id: 'u1', name: 'Alice', email: 'alice@example.com' });
const updatedUser = createMockUser({
  id: 'u1',
  name: 'Alice Updated',
  email: 'alice@example.com',
  phone: '+91 9876543210',
});

function createMocks() {
  return {
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(mockUser),
      updateProfile: vi.fn().mockResolvedValue(updatedUser),
    }),
  };
}

describe('UpdateProfileUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: UpdateProfileUseCase;

  const input = { userId: 'u1', name: 'Alice Updated', phone: '+91 9876543210', avatar: '' };

  beforeEach(() => {
    mocks = createMocks();
    uc = new UpdateProfileUseCase(mocks.userRepo);
  });

  it('should update profile and return success message', async () => {
    const result = await uc.execute(input);

    expect(result.userId).toBe('u1');
    expect(result.message).toBe('Profile updated successfully');
    expect(mocks.userRepo.updateProfile).toHaveBeenCalledWith('u1', {
      name: 'Alice Updated',
      phone: '+91 9876543210',
      avatar: '',
    });
  });

  it('should throw USER_NOT_FOUND when user does not exist', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);

    await expect(uc.execute(input)).rejects.toThrow(DomainError);
    await expect(uc.execute(input)).rejects.toThrow('User not found');
    expect(mocks.userRepo.updateProfile).not.toHaveBeenCalled();
  });

  it('should throw USER_NOT_FOUND when updateProfile returns null', async () => {
    vi.mocked(mocks.userRepo.updateProfile).mockResolvedValue(null);

    await expect(uc.execute(input)).rejects.toThrow('User not found');
  });

  it('should throw on invalid name (too short)', async () => {
    await expect(uc.execute({ ...input, name: 'A' })).rejects.toThrow(DomainError);
    await expect(uc.execute({ ...input, name: 'A' })).rejects.toThrow('Name must be at least 2 characters');
  });

  it('should throw on empty name', async () => {
    await expect(uc.execute({ ...input, name: '' })).rejects.toThrow(DomainError);
  });
});
