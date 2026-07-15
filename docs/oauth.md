# OAuth 2.0 Integration

This guide explains how to use OAuth 2.0 authentication with the Vento Remote MCP Connector.

## Overview

OAuth 2.0 allows users to authorize the connector without sharing their Vento API token directly. Instead, they're redirected to their Vento instance to approve access, and receive a temporary session token.

### Benefits

- **No token sharing**: Users don't expose their API token to the connector
- **Revocable access**: Users can revoke connector access anytime
- **Scoped permissions**: Connectors can request only necessary permissions
- **User-friendly**: Simple authorization flow similar to "Sign in with Google"

## Setup

### 1. Register OAuth Application in Vento

In your Vento instance settings:

1. Go to **Settings → OAuth Applications** (or similar)
2. Create a new application with:
   - **Name**: "Claude Integration" (or your choice)
   - **Redirect URI**: `https://your-connector.railway.app/auth/vento/callback`
   - **Scopes**: `read:boards`, `write:actions`
3. Note the **Client ID** and **Client Secret**

### 2. Configure Connector Environment

Set these environment variables:

```bash
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=https://your-connector.railway.app/auth/vento/callback
```

### 3. Restart Connector

```bash
npm run build && npm start
# or
docker compose up --build
```

## Usage Flow

### For End Users

1. User clicks "Authorize with Vento"
2. Redirected to Vento login page
3. Reviews requested permissions
4. Approves access
5. Redirected back to connector with session token
6. User adds connector to Claude using the session token
7. Done! No manual token management needed

### API Endpoints

#### GET `/auth/vento/authorize`

Initiates OAuth flow. Redirects user to Vento authorization page.

```
GET /auth/vento/authorize
```

#### GET `/auth/vento/callback`

OAuth callback endpoint (configured in Vento). Returns session token.

```
GET /auth/vento/callback?code=AUTH_CODE&state=STATE
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session-token-here",
  "message": "Authorization successful! Add this to your Claude configuration:",
  "instructions": {
    "platform": "Claude",
    "type": "HTTP MCP Server",
    "url": "https://your-connector.railway.app",
    "auth": {
      "type": "Bearer Token",
      "token": "session-token-here"
    }
  }
}
```

#### GET `/auth/vento/token/:sessionId`

Retrieves token for a session (internal use).

```
GET /auth/vento/token/session-token
Authorization: Bearer MCP_AUTH_TOKEN
```

#### POST `/auth/vento/revoke/:sessionId`

Revokes a session token.

```
POST /auth/vento/revoke/session-token
Authorization: Bearer MCP_AUTH_TOKEN
```

## Docker Deployment with OAuth

### Environment File (.env)

```env
# OAuth Configuration
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=your-client-id-from-vento
OAUTH_CLIENT_SECRET=your-client-secret-from-vento
OAUTH_REDIRECT_URI=https://your-domain.railway.app/auth/vento/callback

# MCP Authentication
MCP_AUTH_TOKEN=<generate: openssl rand -hex 32>

# Vento Configuration
VENTO_API_URL=https://your-vento-instance.com
VENTO_TOKEN=your-vento-api-token-for-service-user

# Server
PORT=3000
LOG_LEVEL=info
```

### Railway.app Deployment

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?templateId=vento-remote-mcp)

The Railway template automatically configures OAuth if you provide the environment variables above.

## Security Considerations

### Token Storage

- Session tokens are stored in-memory (cleared on restart)
- For production, consider persistent token storage with encryption
- Tokens should be treated like passwords - keep them secret

### HTTPS Only

Always use HTTPS in production:

```bash
# Check your deployment URL uses HTTPS
echo $OAUTH_REDIRECT_URI  # Should be https://...
```

### State Parameter

OAuth state parameter is validated to prevent CSRF attacks:

- Generated as random 32-byte hex string
- Expires after 10 minutes
- Must match between authorize and callback

### Scope Management

Default scopes requested:

- `read:boards` - Read sensor values
- `write:actions` - Execute action cards

Adjust in `src/routes/oauth.ts` line 30 if needed.

## Troubleshooting

### "OAuth not configured" Error

**Problem**: Getting 503 error at `/auth/vento/authorize`

**Solution**: Ensure all OAuth environment variables are set:
- `OAUTH_ENABLED=true`
- `OAUTH_CLIENT_ID` - not empty
- `OAUTH_CLIENT_SECRET` - not empty
- `OAUTH_REDIRECT_URI` - valid URL

### "Invalid or expired state"

**Problem**: Callback fails with state error

**Solution**: 
- Check that callback happens within 10 minutes of authorize
- Ensure both requests use the same connector instance
- Clear browser cookies if testing locally

### "Token exchange failed"

**Problem**: Getting 500 error on callback

**Solution**:
- Verify `OAUTH_REDIRECT_URI` matches exactly in both Vento settings and connector config
- Check Vento logs for OAuth errors
- Verify Vento OAuth endpoints exist and are accessible

### Session Token Not Working in Claude

**Problem**: Token works at callback but fails in Claude

**Solution**:
- Verify token was stored correctly: `GET /auth/vento/token/YOUR_TOKEN`
- Check token hasn't expired (sessions last until server restart)
- Ensure MCP_AUTH_TOKEN header is included if required
- Verify Claude connector URL is correct

## Fallback: Manual Token

If OAuth isn't available or fails, you can still use manual token auth:

```bash
# Instead of OAuth flow, set directly:
VENTO_TOKEN=your-vento-api-token
```

The `/auth/vento/token/:sessionId` endpoint returns the token for backward compatibility.

## Future Enhancements

Planned OAuth improvements:

- [ ] Persistent token storage with encryption
- [ ] Token refresh before expiration
- [ ] Multiple session support per user
- [ ] OAuth scope management UI
- [ ] Integration with Anthropic Directory for one-click setup
- [ ] Support for multiple Vento instances

## Questions?

Open an issue: https://github.com/geromendez199/vento-remote-mcp/issues
