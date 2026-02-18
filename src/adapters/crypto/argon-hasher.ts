import type { IPasswordHasher } from '@domain/auth/ports.js';
import argon2 from 'argon2';

export class ArgonHasher implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
