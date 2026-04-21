export interface IJwtAccessPayload {
  typ: 'access';
  sub: string;
  jti: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'premium';
}

export interface IJwtRefreshPayload {
  typ: 'refresh';
  sub: string;
  jti: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IGoogleUserInfo {
  email: string;
  name: string;
  googleId: string;
}
