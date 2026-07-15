import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { VentoOAuthClient, TokenStore, generatePKCEChallenge, StoredToken } from '../oauth.js';
import { Config } from '../config.js';
import { pino } from 'pino';

const logger = pino();

interface PKCESession {
  codeVerifier: string;
  timestamp: number;
}

export function createOAuthRouter(config: Config): Router {
  const router = Router();
  const tokenStore = new TokenStore();
  const pkceStates = new Map<string, PKCESession>();
  const STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  if (!config.OAUTH_CLIENT_ID || !config.OAUTH_REDIRECT_URI) {
    logger.warn('OAuth configuration incomplete (client_id or redirect_uri missing), OAuth endpoints will return 503');
    router.use((_req, res) => {
      res.status(503).json({ error: 'OAuth not configured' });
    });
    return router;
  }

  const clientId = config.OAUTH_CLIENT_ID;
  const clientSecret = config.OAUTH_CLIENT_SECRET;
  const redirectUri = config.OAUTH_REDIRECT_URI;

  const oauth = new VentoOAuthClient({
    ventoApiUrl: config.VENTO_API_URL,
    clientId,
    clientSecret,
    redirectUri,
  });

  // Cleanup expired PKCE sessions every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [state, session] of pkceStates.entries()) {
      if (now - session.timestamp > STATE_TIMEOUT) {
        pkceStates.delete(state);
      }
    }
  }, 5 * 60 * 1000);

  router.get('/authorize', (_req, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      const { codeVerifier, codeChallenge } = generatePKCEChallenge();

      pkceStates.set(state, { codeVerifier, timestamp: Date.now() });

      const authUri = oauth.getAuthorizationUri(state, codeChallenge);
      res.redirect(authUri);
    } catch (error) {
      logger.error({ error }, 'OAuth authorization failed');
      res.status(500).json({ error: 'Authorization failed' });
    }
  });

  router.get('/callback', async (req: Request, res: Response): Promise<void> => {
    try {
      const { code, state } = req.query;

      if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).json({ error: 'Missing code or state parameter' });
        return;
      }

      const pkceSession = pkceStates.get(state);
      if (!pkceSession) {
        res.status(400).json({ error: 'Invalid or expired state' });
        return;
      }

      if (Date.now() - pkceSession.timestamp > STATE_TIMEOUT) {
        pkceStates.delete(state);
        res.status(400).json({ error: 'State expired' });
        return;
      }

      pkceStates.delete(state);

      const tokenResponse = await oauth.getToken(code, pkceSession.codeVerifier);
      const sessionId = crypto.randomBytes(16).toString('hex');

      const expiresAt = tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined;

      const storedToken: StoredToken = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
        obtainedAt: Date.now(),
      };

      tokenStore.set(sessionId, storedToken);
      logger.info({ sessionId, expiresAt }, 'OAuth 2.1 authorization successful');

      const connectorUrl = redirectUri.replace('/auth/vento/callback', '');
      res.json({
        success: true,
        sessionId,
        message: 'Authorization successful! Add this to your Claude configuration:',
        expiresAt,
        instructions: {
          platform: 'Claude',
          type: 'HTTP MCP Server',
          url: connectorUrl,
          auth: {
            type: 'Bearer Token',
            token: sessionId,
          },
        },
      });
    } catch (error) {
      logger.error({ error }, 'OAuth callback failed');
      res.status(500).json({ error: 'Token exchange failed' });
    }
  });

  router.get('/token/:sessionId', (req: Request, res: Response): void => {
    try {
      const { sessionId } = req.params;
      const stored = tokenStore.get(sessionId);

      if (!stored) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      // Check if token needs refresh
      if (tokenStore.shouldRefresh(sessionId) && stored.refreshToken) {
        oauth
          .refreshToken(stored.refreshToken)
          .then((tokenResponse) => {
            const expiresAt = tokenResponse.expires_in
              ? Date.now() + tokenResponse.expires_in * 1000
              : undefined;

            const newStored: StoredToken = {
              accessToken: tokenResponse.access_token,
              refreshToken: tokenResponse.refresh_token || stored.refreshToken,
              expiresAt,
              obtainedAt: Date.now(),
            };

            tokenStore.set(sessionId, newStored);
            logger.info({ sessionId }, 'Token auto-refreshed before expiration');

            res.json({
              accessToken: newStored.accessToken,
              refreshToken: newStored.refreshToken,
              expiresAt,
            });
          })
          .catch((error) => {
            logger.error({ error, sessionId }, 'Token refresh failed');
            res.status(500).json({ error: 'Token refresh failed' });
          });
      } else {
        res.json({
          accessToken: stored.accessToken,
          refreshToken: stored.refreshToken,
          expiresAt: stored.expiresAt,
        });
      }
    } catch (error) {
      logger.error({ error }, 'Token retrieval failed');
      res.status(500).json({ error: 'Token retrieval failed' });
    }
  });

  router.post('/revoke/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const stored = tokenStore.get(sessionId);

      if (!stored) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      tokenStore.delete(sessionId);
      logger.info({ sessionId }, 'Token revoked');
      res.json({ success: true, message: 'Token revoked' });
    } catch (error) {
      logger.error({ error }, 'Token revocation failed');
      res.status(500).json({ error: 'Token revocation failed' });
    }
  });

  router.get('/status/:sessionId', (req: Request, res: Response): void => {
    try {
      const { sessionId } = req.params;
      const stored = tokenStore.get(sessionId);

      if (!stored) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      const shouldRefresh = tokenStore.shouldRefresh(sessionId);
      const expiresIn = stored.expiresAt ? stored.expiresAt - Date.now() : null;

      res.json({
        valid: true,
        expiresAt: stored.expiresAt,
        expiresInSeconds: expiresIn ? Math.floor(expiresIn / 1000) : null,
        shouldRefresh,
        hasRefreshToken: !!stored.refreshToken,
      });
    } catch (error) {
      logger.error({ error }, 'Status check failed');
      res.status(500).json({ error: 'Status check failed' });
    }
  });

  return router;
}
