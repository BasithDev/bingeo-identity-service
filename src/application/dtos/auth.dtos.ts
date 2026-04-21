export type {
  IAuthTokens,
  IGoogleUserInfo,
  IJwtAccessPayload,
  IJwtRefreshPayload,
} from '@domain/auth/types';

export interface IRegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface ILoginInput {
  email: string;
  password: string;
}
