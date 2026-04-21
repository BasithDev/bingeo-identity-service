import type { IBaseEntity } from '@domain/shared/entities';

export type { IBaseEntity } from '@domain/shared/entities';

export interface IUserProfile extends IBaseEntity {
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'premium';
  emailVerified: boolean;
  phone: string | null;
  avatar: string | null;
  isBlocked: boolean;
}
