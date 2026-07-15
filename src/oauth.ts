import { pino } from 'pino';
import crypto from 'crypto';

const logger = pino();

export interface OAuthConfig {
  ventoApiUrl: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  obtainedAt: number;
}

export function generatePKCEChallenge(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

export class VentoOAuthClient {
  private config: OAuthConfig;

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  getAuthorizationUri(
    state: string,
    codeChallenge: string,
    scopes: string[] = ['read:boards', 'write:actions']
  ): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `${this.config.ventoApiUrl}/api/oauth/authorize?${params.toString()}`;
  }

  async getToken(authorizationCode: string, codeVerifier: string): Promise<TokenResponse> {
    try {
      const body: Record<string, string> = {
        grant_type: 'authorization_code',
        code: authorizationCode,
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        code_verifier: codeVerifier,
      };

      if (this.config.clientSecret) {
        body.client_secret = this.config.clientSecret;
      }

      const response = await fetch(`${this.config.ventoApiUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ status: response.status, error }, 'OAuth token request failed');
        throw new Error(`Token request failed: ${response.statusText}`);
      }

      const tokenData = (await response.json()) as Partial<TokenResponse>;
      if (!tokenData.access_token) {
        throw new Error('No access token in response');
      }

      logger.info('Successfully obtained OAuth 2.1 token from Vento');
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type || 'Bearer',
      };
    } catch (error) {
      logger.error({ error }, 'Failed to obtain OAuth token');
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const body: Record<string, string> = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
      };

      if (this.config.clientSecret) {
        body.client_secret = this.config.clientSecret;
      }

      const response = await fetch(`${this.config.ventoApiUrl}/api/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = (await response.json()) as Partial<TokenResponse>;
      if (!tokenData.access_token) {
        throw new Error('No access token in refresh response');
      }

      logger.info('Successfully refreshed OAuth token');
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type || 'Bearer',
      };
    } catch (error) {
      logger.error({ error }, 'Failed to refresh OAuth token');
      throw error;
    }
  }
}

export class TokenStore {
  private tokens: Map<string, StoredToken> = new Map();

  set(key: string, token: StoredToken): void {
    this.tokens.set(key, { ...token, obtainedAt: Date.now() });
  }

  get(key: string): StoredToken | null {
    const stored = this.tokens.get(key);
    if (!stored) return null;

    if (stored.expiresAt && stored.expiresAt < Date.now()) {
      this.tokens.delete(key);
      return null;
    }

    return stored;
  }

  shouldRefresh(key: string): boolean {
    const stored = this.tokens.get(key);
    if (!stored || !stored.expiresAt) return false;
    const expiresIn = stored.expiresAt - Date.now();
    return expiresIn < 5 * 60 * 1000; // Refresh if expires in < 5 minutes
  }

  delete(key: string): void {
    this.tokens.delete(key);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
