import { GetUsersUseCase } from '@application/usecases/admin/get-users.usecase';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockUser } from '../../fixtures/entities';
import { createMockUserRepo } from '../../fixtures/mocks';

const baseUser = createMockUser({
  id: 'u1',
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
});

function createMocks() {
  return {
    userRepo: createMockUserRepo({
      findUsers: vi.fn().mockResolvedValue({ data: [baseUser], total: 1 }),
    }),
  };
}

describe('GetUsersUseCase', () => {
  let mocks: ReturnType<typeof createMocks>;
  let uc: GetUsersUseCase;

  const query = { page: 1, pageSize: 10, sortBy: 'joinedAt', sortDir: 'desc' } as const;

  beforeEach(() => {
    mocks = createMocks();
    uc = new GetUsersUseCase(mocks.userRepo);
  });

  it('should return mapped users with correct shape', async () => {
    const result = await uc.execute(query);

    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);

    const user = result.data[0];
    expect(user.id).toBe('u1');
    expect(user.plan).toBe('free');
    expect(user.joinedAt).toBe(new Date('2024-01-15T10:00:00Z').toISOString());
    expect(user.phone).toBe('N/A');
    expect(user.age).toBe(0);
    expect(user.totalWatchHours).toBe(0);
    expect(user.totalPaid).toBe(0);
  });

  it('should use provided phone when available', async () => {
    vi.mocked(mocks.userRepo.findUsers).mockResolvedValue({
      data: [createMockUser({ id: 'u1', phone: '+91 9876543210' })],
      total: 1,
    });

    const result = await uc.execute(query);
    expect(result.data[0].phone).toBe('+91 9876543210');
  });

  it('should return empty data when no users match', async () => {
    vi.mocked(mocks.userRepo.findUsers).mockResolvedValue({ data: [], total: 0 });

    const result = await uc.execute(query);
    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });

  it('should forward the query to the repository', async () => {
    await uc.execute({
      page: 2,
      pageSize: 5,
      search: 'alice',
      sortBy: 'name',
      sortDir: 'asc',
    } as const);
    expect(mocks.userRepo.findUsers).toHaveBeenCalledWith({
      page: 2,
      pageSize: 5,
      search: 'alice',
      sortBy: 'name',
      sortDir: 'asc',
    });
  });
});
