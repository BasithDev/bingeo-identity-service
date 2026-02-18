import type { IGoogleOAuthClient } from '@domain/auth/ports.js';
import type { GoogleUserInfo } from '@domain/user/dtos.js';
import { logger } from '../../logger.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

interface GoogleOAuthConfig {
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
}

export class GoogleOAuthClient implements IGoogleOAuthClient {
  constructor(private readonly config: GoogleOAuthConfig) {}

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.googleClientId,
      redirect_uri: this.config.googleCallbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleUserInfo> {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.config.googleClientId,
        client_secret: this.config.googleClientSecret,
        redirect_uri: this.config.googleCallbackUrl,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      logger.error(
        { status: tokenResponse.status, body: errorBody },
        'Google token exchange failed',
      );
      throw new Error('Failed to exchange Google authorization code');
    }

    const tokenData = (await tokenResponse.json()) as { access_token: string };

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    const userInfo = (await userInfoResponse.json()) as {
      sub: string;
      email: string;
      name: string;
    };

    return {
      googleId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    };
  }
}
