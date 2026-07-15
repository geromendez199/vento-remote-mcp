# Vento Remote MCP - Quick Setup Guide

Get your Claude + Vento integration running in **5 minutes**.

## 🚀 Fastest Way: Railway (Recommended)

### Step 1: Deploy to Railway

Click this button:

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?templateId=vento-remote-mcp)

You'll be prompted for these required values:

| Variable | Example | How to Get |
|----------|---------|-----------|
| `VENTO_API_URL` | `https://vento.example.com` | Your Vento instance URL |
| `VENTO_TOKEN` | `vento_abc123...` | Vento Settings → API Tokens |
| `MCP_AUTH_TOKEN` | `Generated automatically` | Generate: `openssl rand -hex 32` |

Railway will provide a public URL: `https://your-project.railway.app`

### Step 2: Connect to Claude

#### Claude.ai
1. Go to Settings → MCP
2. Click "Add Server"
3. Choose "HTTP"
4. **URL**: `https://your-project.railway.app`
5. **Auth Token**: Your `MCP_AUTH_TOKEN`
6. Save

#### Claude Desktop / Desktop App
Edit `~/.claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vento": {
      "url": "http://localhost:3000",
      "type": "stdio"
    }
  }
}
```

### Step 3: Test

In Claude, ask:
```
What Vento boards do I have access to?
```

Done! 🎉

---

## Advanced: OAuth Flow (One-Click Auth)

If your Vento supports OAuth:

### Step 1: Register OAuth App in Vento

In your Vento instance:
1. **Settings → OAuth Applications**
2. Create new app:
   - Name: "Claude Integration"
   - Redirect URI: `https://your-project.railway.app/auth/vento/callback`
   - Scopes: `read:boards`, `write:actions`
3. Copy **Client ID** and **Client Secret**

### Step 2: Add to Railway

In Railway dashboard, add these variables:

```env
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
OAUTH_REDIRECT_URI=https://your-project.railway.app/auth/vento/callback
```

### Step 3: Authorize

Visit: `https://your-project.railway.app/auth/vento/authorize`

1. You'll be redirected to Vento login
2. Review permissions
3. Click "Approve"
4. You'll get a session token
5. Use this token in Claude instead of `MCP_AUTH_TOKEN`

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker (optional)

### Option A: Docker Compose

```bash
# Clone repo
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp

# Setup environment
cp .env.example .env
# Edit .env with your Vento details

# Start
docker compose up
```

Server runs on `http://localhost:3000`

### Option B: Direct Node

```bash
# Clone & install
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp
npm install

# Configure
cp .env.example .env
nano .env  # Edit with your values

# Build & start
npm run build
npm start
```

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VENTO_API_URL` | Your Vento instance URL | `https://vento.example.com` |
| `VENTO_TOKEN` | Vento API token (read-only recommended) | `vento_...` |
| `MCP_AUTH_TOKEN` | Strong token for Claude auth (32+ chars) | Generate: `openssl rand -hex 32` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `production` | Environment |
| `LOG_LEVEL` | `info` | Log verbosity: debug, info, warn, error |
| `OAUTH_ENABLED` | `false` | Enable OAuth flow |
| `OAUTH_CLIENT_ID` | - | OAuth Client ID from Vento |
| `OAUTH_CLIENT_SECRET` | - | OAuth Client Secret from Vento |
| `OAUTH_REDIRECT_URI` | - | OAuth callback URL |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | `60` | Requests per minute limit |

### Generate Strong Token

```bash
# macOS / Linux
openssl rand -hex 32

# or Python
python3 -c "import secrets; print(secrets.token_hex(32))"

# or Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Troubleshooting

### "Connection refused"
- Check Vento URL is accessible from Railway
- Verify `VENTO_API_URL` doesn't have trailing slash
- Test: `curl https://your-vento-url/api/boards/v1`

### "Unauthorized" / 401 Error
- Verify `VENTO_TOKEN` is correct
- Check token hasn't expired
- Regenerate token in Vento settings

### "Tools not available in Claude"
- Verify MCP_AUTH_TOKEN in Claude settings
- Check server URL doesn't have trailing slash
- Try: `GET https://your-server/health` - should return `{"status":"ok"}`

### Token generation fails
- Update Node.js to version 20+
- Or manually create strong password

### OAuth "Invalid state"
- Check Vento and Connector URLs match
- Ensure callback happens within 10 minutes
- Clear browser cookies

---

## What's Next?

1. **Explore Tools**: List boards, read sensors, execute actions
2. **Create Agents**: Use Claude to build Vento agents
3. **Monitor Devices**: Real-time device status in Claude
4. **Build Automations**: Schedule actions based on Claude's decisions

See [Usage Examples](examples/usage.md) for real-world scenarios.

---

## Need Help?

- **Issues**: [GitHub Issues](https://github.com/geromendez199/vento-remote-mcp/issues)
- **Security**: Email [security contact](SECURITY.md)
- **Questions**: [GitHub Discussions](https://github.com/geromendez199/vento-remote-mcp/discussions)

Happy connecting! 🚀
