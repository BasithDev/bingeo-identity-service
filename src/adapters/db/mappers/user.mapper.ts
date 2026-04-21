import type { IUserProfile } from '@domain/user/entities';

export function toUserProfile(dbRow: {
  id: string;
  name: string;
  email: string;
  role: string;
  subscription: string;
  emailVerified: boolean;
  isBlocked: boolean;
  phone: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date;
}): IUserProfile {
  return {
    id: dbRow.id,
    name: dbRow.name,
    email: dbRow.email,
    role: dbRow.role as 'user' | 'admin',
    subscription: dbRow.subscription as 'free' | 'premium',
    emailVerified: dbRow.emailVerified,
    isBlocked: dbRow.isBlocked,
    phone: dbRow.phone,
    avatar: dbRow.avatar,
    createdAt: dbRow.createdAt,
    updatedAt: dbRow.updatedAt,
  };
}
