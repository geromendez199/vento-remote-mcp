# Integration Guide - v0.2.0

How to connect Claude, Claude Desktop, Cursor, and Claude Code to your Vento Remote MCP Connector.

---

## Prerequisites

1. ✅ Vento instance running (local or cloud)
2. ✅ Vento Remote MCP Connector deployed
3. ✅ `MCP_AUTH_TOKEN` (from deployment)
4. ✅ Public URL of connector (e.g., `https://vento-mcp.railway.app`)

---

## Claude.ai (Web)

**Easiest option. Works on web, mobile, and Claude API.**

### Setup

1. Go to **[claude.ai/app](https://claude.ai/app)**
2. Click **Settings** (bottom left)
3. Click **Custom Connectors**
4. Click **Add Custom Connector**
5. Fill in:
   - **Name**: `Vento` (or your preference)
   - **Server URL**: `https://your-connector-url.com` (public URL)
6. In **Request headers**, click **Add Header**:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_MCP_AUTH_TOKEN`
7. Click **Save**

### Test Connection

In a new Claude conversation, ask:
```
"List my Vento boards"
"What devices are connected?"
"Turn on the pump in the greenhouse"
```

### Example Conversation

```
You:   List my Vento boards with descriptions
Claude: I'll fetch your Vento boards...
        [Claude calls vento_list_boards]
        You have 3 boards:
        - Greenhouse (temperature, humidity, pump control)
        - Living Room (motion sensor, lights)
        - Garden (soil moisture, irrigation)

You:   What's the current temperature in the greenhouse?
Claude: [Calls vento_get_board and vento_get_card_value]
        The greenhouse temperature is currently 24.5°C (76°F).
        Humidity is at 65%.

You:   If it's too hot, turn on the cooling fan
Claude: I'll monitor the temperature and activate cooling if needed.
        [Calls vento_run_action to enable cooling]
        ✓ Cooling fan activated
```

---

## Claude Desktop

**For MacOS and Windows desktop app.**

### Setup

1. Create/edit `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "vento": {
      "url": "https://your-connector-url.com",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

2. Restart Claude Desktop app

### macOS

File path: `~/.claude/mcp.json`

```bash
# Create directory if needed
mkdir -p ~/.claude

# Create config
cat > ~/.claude/mcp.json << 'EOF'
{
  "mcpServers": {
    "vento": {
      "url": "https://your-connector-url.com",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
EOF
```

### Windows

File path: `%APPDATA%\Claude\mcp.json`

```cmd
# Command Prompt
type nul > %APPDATA%\Claude\mcp.json

# Edit file in Notepad:
notepad %APPDATA%\Claude\mcp.json
```

Paste:
```json
{
  "mcpServers": {
    "vento": {
      "url": "https://your-connector-url.com",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

### Verify

1. Restart Claude Desktop
2. Look for 🔌 icon in message input area
3. Click icon → you should see "Vento" listed with ✓ connected

---

## Claude Code (CLI)

**For the Claude Code command-line tool.**

### Setup

```bash
# Add Vento MCP server
claude mcp add --transport http vento https://your-connector-url.com \
  --header "Authorization: Bearer YOUR_MCP_AUTH_TOKEN"

# Or interactively
claude mcp add
→ Name: vento
→ URL: https://your-connector-url.com
→ Header name: Authorization
→ Header value: Bearer YOUR_MCP_AUTH_TOKEN
```

### Verify

```bash
# List connected MCP servers
claude mcp list
→ vento (http) ✓ connected

# Get server info
claude mcp info vento
→ Protocol Version: 2024-11
→ Tools: 6 (vento_list_boards, vento_get_board, ...)
```

### Example Usage

```bash
# Start Claude Code session
claude code

# In Claude Code, use Vento tools:
# "Tell me about my greenhouse board"
# "Execute the irrigation action"
```

---

## Cursor IDE

**Integrated AI in VS Code-like editor.**

### Setup

1. Go to **Cursor Settings** → **Features** → **Custom Connectors**
2. Create/edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vento": {
      "url": "https://your-connector-url.com",
      "auth": {
        "type": "bearer",
        "token": "YOUR_MCP_AUTH_TOKEN"
      }
    }
  }
}
```

3. Restart Cursor

### Verify

Use Cursor's AI chat and ask about Vento:
```
"List my Vento boards"
"What's the status of my devices?"
```

---

## Anthropic API (Direct)

**For applications using `@anthropic-ai/sdk`.**

### Setup

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Add MCP server to resource list
const response = await client.messages.create({
  model: 'claude-opus-4-1',
  max_tokens: 1024,
  tools: [
    {
      type: 'mcp_resource',
      url: 'https://your-connector-url.com',
      auth: {
        type: 'bearer',
        token: 'YOUR_MCP_AUTH_TOKEN',
      },
    },
  ],
  messages: [
    {
      role: 'user',
      content: 'List my Vento boards and tell me about each one',
    },
  ],
});

console.log(response.content);
```

---

## Multiple Vento Instances

**Connect to multiple Vento instances simultaneously.**

### Claude.ai

Add multiple connectors with different instance params:

1. Connector 1: `https://vento-prod.example.com`
   - Name: "Vento Production"
   
2. Connector 2: `https://vento-staging.example.com`
   - Name: "Vento Staging"

Then ask Claude:
```
"Compare temperature readings from production and staging"
"Deploy new sensor config from staging to production"
```

### Claude Desktop (Advanced)

```json
{
  "mcpServers": {
    "vento-prod": {
      "url": "https://vento-prod.example.com",
      "auth": {
        "type": "bearer",
        "token": "PROD_TOKEN"
      }
    },
    "vento-staging": {
      "url": "https://vento-staging.example.com",
      "auth": {
        "type": "bearer",
        "token": "STAGING_TOKEN"
      }
    }
  }
}
```

### Claude Code (Advanced)

```bash
# Add prod instance
claude mcp add vento-prod https://vento-prod.example.com \
  --header "Authorization: Bearer PROD_TOKEN"

# Add staging instance
claude mcp add vento-staging https://vento-staging.example.com \
  --header "Authorization: Bearer STAGING_TOKEN"
```

---

## OAuth Flow (Directory Submission)

**For listing on Anthropic Directory (optional).**

### User Experience

1. User clicks "Add Vento" in Claude settings
2. Redirected to OAuth consent screen
3. Authorizes access
4. Returns to Claude with session token
5. Claude can now access their Vento instance

### Setup on Connector

Ensure OAuth is enabled in deployment:

```env
OAUTH_ENABLED=true
OAUTH_CLIENT_ID=your-vento-oauth-client-id
OAUTH_CLIENT_SECRET=your-vento-oauth-client-secret
OAUTH_REDIRECT_URI=https://your-connector-url.com/auth/vento/callback
```

### OAuth Endpoints

```bash
# 1. Start OAuth flow
GET /auth/vento/authorize
→ Redirects to Vento OAuth consent screen

# 2. Callback (automatic)
GET /auth/vento/callback?code=...&state=...
→ Returns { "success": true, "sessionId": "...", "instructions": {...} }

# 3. Get token for session
GET /auth/vento/token/{sessionId}
→ Returns { "accessToken": "...", "expiresAt": ... }

# 4. Check token status
GET /auth/vento/status/{sessionId}
→ Returns { "valid": true, "expiresInSeconds": 3600, "shouldRefresh": false }

# 5. Revoke session
POST /auth/vento/revoke/{sessionId}
→ Returns { "success": true }
```

---

## Common Workflows

### Home Automation

```
You:   Set up my greenhouse automation
Claude: I'll create a workflow that:
        - Monitors temperature (sensor in greenhouse board)
        - If > 28°C, activates cooling fan (action card)
        - Logs readings to history
        
        Would you like me to create this?

You:   Yes, and add humidity control too
Claude: ✓ Workflow configured
        - Temperature: 28°C → cooling fan ON
        - Humidity: > 70% → ventilation ON
        - Notifications when either exceeds threshold
```

### Device Monitoring

```
You:   Show me devices that haven't reported in > 1 hour
Claude: [Calls vento_list_devices]
        Device "GardenSensor-01" (ESP32) last seen 2 hours ago
        Device "GreenhouseCam" (Android) last seen 45 minutes ago
        
        GardenSensor-01 may have connectivity issues.

You:   Check its configuration
Claude: [Gets device details]
        GardenSensor-01 is configured to report every 30 minutes.
        Last reading: soil moisture 45% at 14:23 UTC
        Recommendation: Check WiFi signal or battery
```

### Data Analysis

```
You:   Summarize temperature trends for the past week
Claude: [Calls vento_get_board multiple times with date range]
        Temperature Summary (Past 7 days):
        - Average: 22.5°C
        - High: 28°C (yesterday 14:30)
        - Low: 18°C (3 days ago 06:00)
        - Trend: +1.2°C/day (warming)
        
        Recommendation: Cooling system may need upgrade
```

---

## Troubleshooting

### "Connector not found" or "Connection failed"

**Check:**
1. Public URL is correct in settings
2. URL is HTTPS (not HTTP)
3. Token is correct
4. Connector is running: `curl https://your-url/health`

**Fix:**
```bash
# Restart connector
railway restart  # Railway
flyctl restart   # Fly.io
sudo systemctl restart vento-remote-mcp  # Systemd
docker-compose restart  # Docker
```

### "Authorization failed"

**Check:**
1. Token is exactly correct (copy from deployment)
2. Token format is `Bearer YOUR_TOKEN` (with "Bearer " prefix)
3. No extra spaces or newlines

**Fix:**
```bash
# Generate new token
openssl rand -hex 32

# Update in connector env vars
# Restart connector
```

### "Tool not found" or "Permission denied"

**Check:**
1. `ALLOW_DESTRUCTIVE_TOOLS=true` (if using vento_run_action)
2. `ALLOWED_TOOLS` is empty or includes the tool you want
3. Tool exists: `curl https://your-url/info -H "Authorization: Bearer TOKEN"`

**Fix:**
```env
# Allow all tools
ALLOW_DESTRUCTIVE_TOOLS=true
ALLOWED_TOOLS=

# Or allow specific tools
ALLOWED_TOOLS=vento_list_boards,vento_get_board,vento_get_card_value
```

### "Rate limited (429)"

**Check:**
1. Requests exceed 60/min per token
2. Or exceed 10/sec burst

**Fix:**
```env
# Increase limits (if needed for your use case)
RATE_LIMIT_REQUESTS_PER_MINUTE=120
RATE_LIMIT_BURST_PER_SECOND=20
```

### "Vento API unreachable"

**Check:**
1. `VENTO_API_URL` is correct
2. Vento instance is running and healthy
3. Network connectivity from connector to Vento

**Fix:**
```bash
# Test from connector server
curl https://your-vento-url/health

# Check firewall allows connector → Vento
# Check VENTO_TOKEN has API access in Vento
```

---

## Advanced Configuration

### Read-Only Mode

```env
ALLOW_DESTRUCTIVE_TOOLS=false
```

Claude can only read boards and devices, not execute actions.

### Specific Tools Only

```env
ALLOWED_TOOLS=vento_list_boards,vento_get_board,vento_get_card_value
```

Hides `vento_run_action` and `vento_send_to_agent` from discovery.

### Rate Limiting by User

Currently rate limiting is per-token (not per-user). For per-user limits:
1. Generate unique token per user
2. Assign separate `MCP_AUTH_TOKEN_USER_1`, etc.
3. Load from user context in middleware

### Custom Scopes (Future)

When Vento supports OAuth scopes:
1. Request `read:boards` (read only)
2. Request `write:actions` (execute actions)
3. Token automatically limited to scope

---

## Next Steps

1. ✅ Deploy connector to your platform
2. ✅ Add to Claude / Claude Desktop / Code CLI
3. ✅ Test with simple queries
4. ✅ Create automation workflows
5. ✅ Monitor with `/metrics` endpoint
6. ✅ (Optional) Submit to Anthropic Directory

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for platform-specific steps.

---

**Questions?** [GitHub Issues](https://github.com/geromendez199/vento-remote-mcp/issues) | [Discord](https://discord.gg/VpeZxMFfYW)
