import { pino } from 'pino';

const logger = pino();

export interface OAuthConfig {
  ventoApiUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class VentoOAuthClient {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  getAuthorizationUri(state: string, scopes: string[] = ['read:boards', 'write:actions']): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
    });

    return `${this.config.ventoApiUrl}/api/oauth/authorize?${params.toString()}`;
  }

  async getToken(authorizationCode: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.ventoApiUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: authorizationCode,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ status: response.status, error }, 'OAuth token request failed');
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const tokenData = (await response.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        throw new Error('No access token in response');
      }

      logger.info('Successfully obtained OAuth token from Vento');
      return tokenData.access_token;
    } catch (error) {
      logger.error({ error }, 'Failed to obtain OAuth token');
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.ventoApiUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = (await response.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        throw new Error('No access token in refresh response');
      }

      logger.info('Successfully refreshed OAuth token');
      return tokenData.access_token;
    } catch (error) {
      logger.error({ error }, 'Failed to refresh OAuth token');
      throw error;
    }
  }
}

export class TokenStore {
  private tokens: Map<string, { token: string; expiresAt?: number }> = new Map();

  set(key: string, token: string, expiresAt?: number): void {
    this.tokens.set(key, { token, expiresAt });
  }

  get(key: string): string | null {
    const stored = this.tokens.get(key);
    if (!stored) return null;

    if (stored.expiresAt && stored.expiresAt < Date.now()) {
      this.tokens.delete(key);
      return null;
    }

    return stored.token;
  }

  delete(key: string): void {
    this.tokens.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
