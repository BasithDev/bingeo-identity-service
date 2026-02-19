export interface JwtAccessPayload {
  sub: string; // userId
  jti: string; // unique token ID (for blacklisting)
  email: string;
  name: string;
  role: 'user' | 'admin';
  subscription: 'free' | 'premium';
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
