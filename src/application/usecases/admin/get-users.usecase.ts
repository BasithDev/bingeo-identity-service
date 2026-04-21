import type { IFindUsersQuery, IUserRepository } from '@domain/user/ports';

export interface IGetUsersExecutor {
  execute(query: IFindUsersQuery): Promise<{
    total: number;
    data: Array<{
      id: string;
      name: string;
      email: string;
      role: 'user' | 'admin';
      emailVerified: boolean;
      isBlocked: boolean;
      avatar: string | null;
      joinedAt: string;
      plan: 'free' | 'basic' | 'premium';
      phone: string;
      age: number;
      totalWatchHours: number;
      totalPaid: number;
    }>;
  }>;
}

export class GetUsersUseCase implements IGetUsersExecutor {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(query: IFindUsersQuery): Promise<{
    total: number;
    data: Array<{
      id: string;
      name: string;
      email: string;
      role: 'user' | 'admin';
      emailVerified: boolean;
      isBlocked: boolean;
      avatar: string | null;
      joinedAt: string;
      plan: 'free' | 'basic' | 'premium';
      phone: string;
      age: number;
      totalWatchHours: number;
      totalPaid: number;
    }>;
  }> {
    const result = await this.userRepo.findUsers(query);

    return {
      total: result.total,
      data: result.data.map((u) => {
        const { createdAt, subscription, phone, ...rest } = u;
        return {
          ...rest,
          joinedAt: createdAt.toISOString(),
          plan: subscription as 'free' | 'basic' | 'premium',
          phone: phone || 'N/A',
          age: 0,
          totalWatchHours: 0,
          totalPaid: 0,
        };
      }),
    };
  }
}
