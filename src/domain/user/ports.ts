import type { IUserProfile } from './entities';

export interface IFindUsersQuery {
  page: number;
  pageSize: number;
  search?: string;
  plan?: string;
  sortBy?: 'joinedAt' | 'age' | 'totalPaid' | 'totalWatchHours' | 'name';
  sortDir?: 'asc' | 'desc';
}

export interface IUserListResult {
  data: IUserProfile[];
  total: number;
}

export interface IUserRepository {
  findById(id: string): Promise<IUserProfile | null>;
  findByEmail(email: string): Promise<IUserProfile | null>;
  create(data: {
    email: string;
    name: string;
    role: 'user' | 'admin';
    subscription: 'free' | 'premium';
  }): Promise<IUserProfile>;
  updateSubscription(id: string, subscription: 'free' | 'premium'): Promise<IUserProfile | null>;
  updateProfile(
    id: string,
    data: Partial<Pick<IUserProfile, 'name' | 'phone' | 'avatar'>>,
  ): Promise<IUserProfile | null>;
  verifyEmail(userId: string): Promise<IUserProfile | null>;
  updateBlockedStatus(userId: string, isBlocked: boolean): Promise<void>;
  findUsers(query: IFindUsersQuery): Promise<IUserListResult>;
}
