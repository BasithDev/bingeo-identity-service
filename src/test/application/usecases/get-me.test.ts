import { GetMeUseCase } from '@application/usecases/user/get-me.usecase';
import { DomainError } from '@domain/shared/errors';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockUser } from '../../fixtures/entities';
import { createMockUserRepo } from '../../fixtures/mocks';

const mockUser = createMockUser();

function createMocks() {
  return {
    userRepo: createMockUserRepo({
      findById: vi.fn().mockResolvedValue(mockUser),
    }),
  };
}

describe('GetMeUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: GetMeUseCase;

  beforeEach(() => {
    mocks = createMocks();
    uc = new GetMeUseCase(mocks.userRepo);
  });

  it('should return user profile for valid userId', async () => {
    const result = await uc.execute(mockUser.id);
    expect(result.id).toBe(mockUser.id);
    expect(result.email).toBe('test@example.com');
    expect(mocks.userRepo.findById).toHaveBeenCalledWith(mockUser.id);
  });

  it('should throw USER_NOT_FOUND if user does not exist', async () => {
    vi.mocked(mocks.userRepo.findById).mockResolvedValue(null);
    await expect(uc.execute('nonexistent')).rejects.toThrow(DomainError);
    await expect(uc.execute('nonexistent')).rejects.toThrow('User not found');
  });
});
