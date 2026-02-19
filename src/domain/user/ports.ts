import type { UserProfile } from './entities.js';

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByEmail(email: string): Promise<UserProfile | null>;
  create(data: {
    email: string;
    name: string;
    role: string;
    subscription: string;
  }): Promise<UserProfile>;
  updateSubscription(id: string, subscription: string): Promise<UserProfile | null>;
  updateProfile(
    id: string,
    data: Partial<Pick<UserProfile, 'name' | 'phone' | 'avatar'>>,
  ): Promise<UserProfile | null>;
}
