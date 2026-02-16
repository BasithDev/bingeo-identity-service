import type { BaseEntity } from '../user/entities.js';

export interface AuthCredential extends BaseEntity {
  userId: string;
  email: string;
  passwordHash: string | null;
  provider: 'local' | 'google';
  providerId: string | null;
}
