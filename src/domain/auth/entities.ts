import type { IBaseEntity } from '@domain/user/entities';

export interface IAuthCredential extends IBaseEntity {
  userId: string;
  email: string;
  passwordHash: string | null;
  provider: 'local' | 'google';
  providerId: string | null;
}
