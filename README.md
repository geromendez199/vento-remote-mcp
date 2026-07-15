# Vento Remote MCP Connector

<div align="center">

[![CI Status](https://github.com/geromendez199/vento-remote-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/geromendez199/vento-remote-mcp/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Connect Claude, Claude Desktop, and Cursor to any Vento instance via Model Context Protocol**

---

### 🚀 Quick Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?templateId=vento-remote-mcp)

<details>
<summary><b>Deploy on other platforms</b></summary>

- [Railway](#railway) (1-click, `railway.json`) ⭐ Easiest
- [Render](docs/deploy.md#render) (Blueprint: `render.yaml` included)
- [Fly.io](docs/deploy.md#flyio) (`fly.toml` included)
- [Docker](#docker)
- [VPS + Systemd](docs/deploy.md#vps--systemd)
- [Cloudflare Tunnel](docs/deploy.md#cloudflare-tunnel)

</details>

</div>

Vento Remote MCP is a production-ready remote server that bridges Claude (claude.ai, mobile app, Claude Desktop, Claude Code, and the Anthropic API) with any Vento instance (self-hosted or cloud.vento.build). It enables AI assistants to read sensor values, monitor device status, and execute real-world actions through Vento boards and agents.

## What is Vento?

[Vento](https://github.com/protofy-xyz/protofy) is an AI control and automation platform for devices, machines, and spaces:

- **Boards**: Visual dashboards composed of cards representing sensors (value cards) and actuators (action cards)
- **AI Agents**: LLM-powered decision loops that observe the world, make decisions, and take action
- **Device Integration**: Native support for ESP32/ESPHome, Android phones, Go/Python agents, and custom MQTT devices
- **Real-time Control**: MQTT-based instant communication with physical devices and sensors

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLAUDE ECOSYSTEM                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  Claude.ai   │  │Claude Desktop│  │   Claude Code      │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬─────────────┘    │
│         └────────────┬────────────────────────┘                 │
│                      │                                          │
│                      ▼                                          │
│         ┌─────────────────────────────┐                        │
│         │ Anthropic API / MCP Client  │                        │
│         └────────────┬────────────────┘                        │
└──────────────────────┼─────────────────────────────────────────┘
                       │
                       │ HTTP (Bearer Token Auth)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│          VENTO REMOTE MCP CONNECTOR (This Project)             │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ • Tool Registry (6 MCP tools for reading/controlling)      ││
│  │ • MCP Protocol Handler                                      ││
│  │ • Vento API Client                                          ││
│  │ • Authentication & Rate Limiting                            ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ REST (Bearer Token Auth)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│        VENTO CORE API (Your Vento Instance)                    │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ • /api/boards/v1 - Boards & Cards Management              ││
│  │ • /api/agents/v1 - AI Agents                              ││
│  │ • /api/devices/v1 - Device Registry                       ││
│  └────────────────────────────────────────────────────────────┘│
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
          ┌──────────────────────────────┐
          │  PHYSICAL WORLD (Real Actions)│
          │  • IoT Devices (ESP32)        │
          │  • Motors & Sensors           │
          │  • Android Phones             │
          │  • MQTT Network               │
          └──────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+ or Docker
- A running Vento instance (local or remote)
- Vento API token
- Anthropic API key (for claude.ai integration)

### Installation

#### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp

# Configure environment
cp .env.example .env
# Edit .env with your Vento credentials

# Start the connector
docker compose up
```

#### Option 2: Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your Vento credentials

# Start in development mode
npm run dev

# Or build and run production
npm run build
npm start
```

#### Option 3: Deploy to Cloud

**Railway**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new?template=https://github.com/geromendez199/vento-remote-mcp&envs=MCP_AUTH_TOKEN,VENTO_API_URL,VENTO_TOKEN)

**Render**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/geromendez199/vento-remote-mcp)

**Fly.io**

```bash
fly launch --repo https://github.com/geromendez199/vento-remote-mcp
fly secrets set MCP_AUTH_TOKEN=your-token
fly secrets set VENTO_API_URL=https://your-vento-instance.com
fly secrets set VENTO_TOKEN=your-vento-api-token
fly deploy
```

**VPS + Cloudflared**

```bash
# Deploy to VPS
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp
npm install && npm run build

# Install systemd service
sudo cp systemd/vento-remote-mcp.service /etc/systemd/system/
sudo systemctl enable vento-remote-mcp
sudo systemctl start vento-remote-mcp

# Expose via Cloudflared tunnel
cloudflared tunnel create vento-mcp
cloudflared tunnel route dns vento-mcp your-domain.com
cloudflared tunnel run --token $TUNNEL_TOKEN
```

### Configuration

Create `.env` file:

```env
# Server
PORT=3000
LOG_LEVEL=info

# Security
MCP_AUTH_TOKEN=<generate with: openssl rand -hex 32>

# Vento Connection
VENTO_API_URL=http://localhost:8000
VENTO_TOKEN=your-vento-api-token

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## Using with Claude

### Claude.ai or Claude Mobile App

1. Go to [claude.ai/app](https://claude.ai/app)
2. Click **Settings** → **Custom Connectors**
3. Click **Add Custom Connector**
4. Enter:
   - **Name**: Vento
   - **Server URL**: `https://your-connector-url.com` (public URL of your deployment)
5. In the request header section, add:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_MCP_AUTH_TOKEN`
6. Save

Now you can ask Claude to "list my Vento boards" or "turn on the pump".

### Claude Desktop

Add to `~/.claude/mcp.json`:

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

### Claude Code

```bash
claude mcp add --transport http vento https://your-connector-url.com \
  --header "Authorization: Bearer YOUR_MCP_AUTH_TOKEN"
```

### Cursor

Add to `~/.cursor/mcp.json`:

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

## Available Tools

All tools are read-only unless noted otherwise.

| Tool | Description | Use Case |
|------|-------------|----------|
| `vento_list_boards` | List all boards with name and description | Discover available boards |
| `vento_get_board` | Get complete board state: cards and current values | Monitor sensor data and see available actions |
| `vento_get_card_value` | Get current value of a specific sensor card | Check single sensor reading |
| `vento_list_devices` | List connected devices (ESP32, Android, etc.) | Monitor device network status |
| `vento_run_action` | **Execute** an action card ⚠️ | Control pumps, motors, GPIO, send alerts |
| `vento_send_to_agent` | Send message to Vento AI agent | Trigger automation flows using natural language |

Every tool accepts an optional `instance` argument to target a specific Vento
instance when `VENTO_INSTANCES` is configured (see below).

## Production Features

### Tool permissions (read-only mode)

```env
# Allowlist specific tools (unset = all)
ALLOWED_TOOLS=vento_list_boards,vento_get_board,vento_get_card_value

# Or just hide destructive tools (vento_run_action)
ALLOW_DESTRUCTIVE_TOOLS=false
```

Blocked tools are removed from discovery *and* rejected at execution — a
client that skips `tools/list` still can't call them.

### Multiple Vento instances

```env
VENTO_INSTANCES={"staging":{"url":"https://staging.vento.example.com","token":"tok"}}
```

The primary instance (`VENTO_API_URL`) is always available as `default`.
Claude can then say: *"compare the temperature on production and staging"* —
each tool call routes via its `instance` argument.

### Observability

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Readiness: pings Vento, reports `latencyMs` (503 when degraded) |
| `GET /health/live` | Liveness: cheap, no upstream calls |
| `GET /metrics` | Prometheus metrics (bearer-auth protected) |
| `GET /info` | Server version, instances, exposed tools with danger levels |

Metrics include request duration histograms, Vento API call counters,
per-tool execution counters, auth failures, rate-limited requests, and cache
hit/miss. Every HTTP response carries an `X-Request-Id` that appears in all
correlated log lines.

### Rate limiting & caching

- Per-token rate limiting: `RATE_LIMIT_REQUESTS_PER_MINUTE` (default 60) plus
  `RATE_LIMIT_BURST_PER_SECOND` (default 10). Clients are keyed by token hash.
- Board reads are cached for `CACHE_TTL_SECONDS` (default 30) and invalidated
  automatically when an action executes on that board. Live sensor reads are
  never cached.

## Security

⚠️ **Important**: This connector controls real physical devices. Use with caution.

### Authentication

1. **Claude ↔ Connector**: Bearer token in HTTP headers
   - Set `MCP_AUTH_TOKEN` to a strong random value (min 32 characters)
   - Generate: `openssl rand -hex 32`
   - Never commit tokens to version control

2. **Connector ↔ Vento**: API token in environment variables
   - Store `VENTO_TOKEN` in environment, not in code
   - Use separate tokens for dev/prod
   - Rotate regularly

### Permissions

- Use `ALLOW_DESTRUCTIVE_TOOLS=false` for read-only deployments
- Use `ALLOWED_TOOLS` to expose only specific tools
- Bearer comparison is timing-safe; auth failures are counted in `/metrics`
- Rate limiting is on by default (per-token, with burst control)

### Best Practices

✅ DO:
- Use strong, randomly generated tokens
- Rotate tokens regularly
- Deploy over HTTPS only
- Monitor logs for suspicious activity
- Restrict Vento board access to essential actions
- Test actions in development first

❌ DON'T:
- Commit tokens to git
- Use the same token across multiple deployments
- Expose the connector to untrusted networks
- Disable authentication
- Connect to production Vento with test credentials

## Development

### Project Structure

```
vento-remote-mcp/
├── src/
│   ├── index.ts              # Server bootstrap (stdio or HTTP)
│   ├── server.ts             # MCP tool registration
│   ├── config.ts             # Environment validation (zod)
│   ├── auth.ts               # Bearer token middleware
│   ├── vento/
│   │   ├── client.ts         # HTTP client for Vento API
│   │   └── types.ts          # TypeScript types for Vento
│   └── tools/                # Individual tool implementations
│       ├── listBoards.ts
│       ├── getBoard.ts
│       ├── getCardValue.ts
│       ├── listDevices.ts
│       ├── runAction.ts
│       └── sendToAgent.ts
├── test/                     # Unit and integration tests
├── docs/
│   ├── vento-api.md          # Complete API reference
│   └── deploy.md             # Deployment guides
├── Dockerfile                # Multi-stage Docker build
├── docker-compose.yml        # Local dev environment
├── .env.example              # Configuration template
└── README.md                 # This file
```

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage

# Interactive UI
npm run test:ui
```

### Type Checking & Linting

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Fix lint issues
npm run lint -- --fix
```

### End-to-End Testing

```bash
# Start local Vento + Connector
docker compose up

# In another terminal, test with the MCP inspector
npx @modelcontextprotocol/inspector ts-node src/index.ts

# Or test HTTP endpoints
curl http://localhost:3000/health
curl -H "Authorization: Bearer test-token" http://localhost:3000/info
```

## Roadmap

- [x] Core MCP server with stdio transport
- [x] HTTP transport support for remote deployment
- [x] Bearer token authentication
- [ ] OAuth 2.1 support for Anthropic directory submission
- [ ] Tool filtering and per-conversation permissions
- [ ] Rate limiting and request logging
- [ ] WebSocket transport support
- [ ] Multiple Vento instance support
- [ ] Board state caching and subscriptions
- [ ] Custom tool creation from Vento agents
- [ ] Anthropic MCP directory submission

## Troubleshooting

### "Invalid authorization header"

Make sure you're using Bearer token authentication:
```
Authorization: Bearer YOUR_MCP_AUTH_TOKEN
```

### "Failed to connect to Vento API"

Check:
1. `VENTO_API_URL` is correct and accessible
2. `VENTO_TOKEN` is valid
3. Firewall allows outbound connections
4. Vento instance is running and healthy

### Connector not showing in Claude

1. Verify the public URL is accessible: `curl https://your-url.com/health`
2. Check token is correct in Claude settings
3. Wait 1-2 minutes for Claude to sync
4. Restart Claude app if needed

### Actions not executing

1. Test directly with curl:
   ```bash
   curl -X POST https://your-url.com/mcp \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"method":"initialize","params":{}}'
   ```
2. Check Vento board exists and action is enabled
3. Review logs: `docker compose logs connector`

## Community & Support

- **Discord**: [Join Vento Discord](https://discord.gg/VpeZxMFfYW)
- **Issues**: [GitHub Issues](https://github.com/geromendez199/vento-remote-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/geromendez199/vento-remote-mcp/discussions)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes with tests
4. Run: `npm run lint && npm test && npm run type-check`
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - See [LICENSE](LICENSE) for details

### Credits

Built with ❤️ for the [Vento](https://github.com/protofy-xyz/protofy) community by [Gero Méndez](https://github.com/geromendez199)

Special thanks to:
- [Anthropic](https://www.anthropic.com/) for Claude and the Model Context Protocol
- [Protofy](https://github.com/protofy-xyz) for Vento

---

**Want to contribute, report a bug, or suggest a feature?** Open an issue or discussion on [GitHub](https://github.com/geromendez199/vento-remote-mcp)!
