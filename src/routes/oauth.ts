import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { VentoOAuthClient, TokenStore } from '../oauth.js';
import { Config } from '../config.js';
import { pino } from 'pino';

const logger = pino();

export function createOAuthRouter(config: Config): Router {
  const router = Router();
  const tokenStore = new TokenStore();

  if (!config.OAUTH_CLIENT_ID || !config.OAUTH_CLIENT_SECRET || !config.OAUTH_REDIRECT_URI) {
    logger.warn('OAuth configuration incomplete, OAuth endpoints will return 503');
    router.use((_req, res) => {
      res.status(503).json({ error: 'OAuth not configured' });
    });
    return router;
  }

  // Type guard: these are checked above, so cast is safe
  const clientId = config.OAUTH_CLIENT_ID;
  const clientSecret = config.OAUTH_CLIENT_SECRET;
  const redirectUri = config.OAUTH_REDIRECT_URI;

  const oauth = new VentoOAuthClient({
    ventoApiUrl: config.VENTO_API_URL,
    clientId,
    clientSecret,
    redirectUri,
  });

  const states = new Map<string, number>();
  const STATE_TIMEOUT = 10 * 60 * 1000; // 10 minutes

  router.get('/authorize', (_req, res) => {
    try {
      const state = crypto.randomBytes(32).toString('hex');
      states.set(state, Date.now());

      const authUri = oauth.getAuthorizationUri(state);
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
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const stateTimestamp = states.get(state);
      if (!stateTimestamp) {
        res.status(400).json({ error: 'Invalid or expired state' });
        return;
      }

      if (Date.now() - stateTimestamp > STATE_TIMEOUT) {
        states.delete(state);
        res.status(400).json({ error: 'State expired' });
        return;
      }

      states.delete(state);

      const token = await oauth.getToken(code);
      const sessionId = crypto.randomBytes(16).toString('hex');
      tokenStore.set(sessionId, token);

      logger.info({ sessionId }, 'OAuth authorization successful');

      const connectorUrl = redirectUri.replace('/auth/vento/callback', '');
      res.json({
        success: true,
        sessionId,
        message: 'Authorization successful! Add this to your Claude configuration:',
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
      const token = tokenStore.get(sessionId);

      if (!token) {
        res.status(404).json({ error: 'Session not found or expired' });
        return;
      }

      res.json({ token });
    } catch (error) {
      logger.error({ error }, 'Token retrieval failed');
      res.status(500).json({ error: 'Token retrieval failed' });
    }
  });

  router.post('/revoke/:sessionId', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      tokenStore.delete(sessionId);
      res.json({ success: true, message: 'Token revoked' });
    } catch (error) {
      logger.error({ error }, 'Token revocation failed');
      res.status(500).json({ error: 'Token revocation failed' });
    }
  });

  return router;
}
