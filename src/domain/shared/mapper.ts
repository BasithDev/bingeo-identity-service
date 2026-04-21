import type { UserProfile } from '../user/entities.js';

export class UserMapper {
  static toProfile(dbRow: {
    id: string;
    name: string;
    email: string;
    role: string;
    subscription: string;
    emailVerified: boolean;
    phone: string | null;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserProfile {
    return {
      id: dbRow.id,
      name: dbRow.name,
      email: dbRow.email,
      role: dbRow.role as 'user' | 'admin',
      subscription: dbRow.subscription as 'free' | 'premium',
      emailVerified: dbRow.emailVerified,
      phone: dbRow.phone,
      avatar: dbRow.avatar,
      createdAt: dbRow.createdAt,
      updatedAt: dbRow.updatedAt,
    };
  }
}
