# Deployment Guide - v0.2.0

Complete guide for deploying Vento Remote MCP Connector to production platforms.

---

## Quick Start

**Pick your platform:**
1. [Railway](#railway-1-click) (1-click, recommended)
2. [Render](#render-blueprint)
3. [Fly.io](#flyio)
4. [Docker](#docker)
5. [Self-Hosted VPS](#self-hosted-vps--systemd)

---

## Railway (1-click)

**Easiest option.** All env vars pre-configured in `railway.json`.

### Deploy

```bash
# Option A: Click button
# Go to: https://railway.app/new?templateId=vento-remote-mcp

# Option B: CLI
railway login
railway init
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp
railway up
```

### Configure

Railway will prompt for:
- `MCP_AUTH_TOKEN`: Generate with `openssl rand -hex 32`
- `VENTO_API_URL`: Your Vento instance (e.g., `https://vento.example.com`)
- `VENTO_TOKEN`: From Vento Settings → API Keys
- `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET` (optional, for directory submission)

### Verify Deployment

```bash
# Get public URL
railway status

# Test health
curl https://<railway-url>.up.railway.app/health

# Test auth
curl -H "Authorization: Bearer <MCP_AUTH_TOKEN>" \
  https://<railway-url>.up.railway.app/metrics
```

### Logs

```bash
railway logs
```

---

## Render (Blueprint)

**One-click deployment with auto-redeploy on git push.**

### Deploy

1. Click: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/new?repo=https://github.com/geromendez199/vento-remote-mcp)

2. Set environment variables (same as Railway above)

3. Click "Deploy"

### Configure After Deploy

Go to **Service** → **Environment**:
- `VENTO_API_URL`
- `VENTO_TOKEN`
- `MCP_AUTH_TOKEN` (Render generates if missing)
- Optional: `OAUTH_*` variables

### Verify Deployment

```bash
# Get URL from Render dashboard
curl https://<render-url>.onrender.com/health

# Monitor logs in Render dashboard
```

---

## Fly.io

**Global edge deployment, ~$2.50/month starter.**

### Prerequisites

```bash
brew install flyctl
flyctl auth login
```

### Deploy

```bash
cd vento-remote-mcp
flyctl launch --copy-config --auto-confirm

# Set secrets
flyctl secrets set MCP_AUTH_TOKEN="$(openssl rand -hex 32)"
flyctl secrets set VENTO_API_URL="https://vento.example.com"
flyctl secrets set VENTO_TOKEN="your-vento-token"

# Optional: OAuth
flyctl secrets set OAUTH_CLIENT_ID="..."
flyctl secrets set OAUTH_CLIENT_SECRET="..."

# Deploy
flyctl deploy
```

### Verify Deployment

```bash
# Get URL
flyctl status

# Test
curl https://<app-name>.fly.dev/health

# Logs
flyctl logs
```

### Scale & Monitor

```bash
# Scale to 2 instances
flyctl scale count 2

# Monitor metrics
flyctl status -a <app-name>
```

---

## Docker

**Run locally or on any Docker host.**

### Build Locally

```bash
docker build -t vento-remote-mcp:0.2.0 .

# Or pull from GHCR
docker pull ghcr.io/geromendez199/vento-remote-mcp:0.2.0
```

### Run Container

```bash
docker run -p 3000:3000 \
  -e MCP_AUTH_TOKEN="$(openssl rand -hex 32)" \
  -e VENTO_API_URL="https://vento.example.com" \
  -e VENTO_TOKEN="your-vento-token" \
  -e LOG_LEVEL="info" \
  ghcr.io/geromendez199/vento-remote-mcp:0.2.0
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vento-mcp:
    image: ghcr.io/geromendez199/vento-remote-mcp:0.2.0
    container_name: vento-mcp
    ports:
      - "3000:3000"
    environment:
      PORT: "3000"
      NODE_ENV: production
      LOG_LEVEL: info
      MCP_TRANSPORT: http
      MCP_AUTH_TOKEN: "${MCP_AUTH_TOKEN}"
      VENTO_API_URL: "${VENTO_API_URL}"
      VENTO_TOKEN: "${VENTO_TOKEN}"
      RATE_LIMIT_ENABLED: "true"
      CACHE_TTL_SECONDS: "30"
      OAUTH_ENABLED: "true"
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
    restart: unless-stopped

  # Optional: Nginx reverse proxy with HTTPS
  nginx:
    image: nginx:latest
    container_name: vento-nginx
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - vento-mcp
    restart: unless-stopped
```

Start:

```bash
# Create .env
cp .env.example .env
# Edit with your values

# Start
docker-compose up -d

# Logs
docker-compose logs -f vento-mcp
```

---

## Self-Hosted VPS + Systemd

**Full control, ~$5-10/month on DigitalOcean/Linode.**

### Prerequisites

- Ubuntu 20.04+ or Debian 11+
- Node.js 20+ (or use Docker)
- Nginx or Caddy (HTTPS reverse proxy)
- Domain name (with HTTPS certificate)

### Install

```bash
# SSH to VPS
ssh root@your-vps.com

# Clone repository
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp

# Install dependencies
npm ci

# Build
npm run build

# Create .env
cp .env.example .env
# Edit with your values
nano .env
```

### Systemd Service

Create `/etc/systemd/system/vento-remote-mcp.service`:

```ini
[Unit]
Description=Vento Remote MCP Connector
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=vento-mcp
WorkingDirectory=/opt/vento-remote-mcp
EnvironmentFile=/opt/vento-remote-mcp/.env
ExecStart=/usr/bin/node /opt/vento-remote-mcp/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vento-mcp

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

Enable & Start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable vento-remote-mcp
sudo systemctl start vento-remote-mcp

# Check status
sudo systemctl status vento-remote-mcp

# Logs
sudo journalctl -u vento-remote-mcp -f
```

### Nginx Reverse Proxy

Create `/etc/nginx/sites-available/vento-mcp`:

```nginx
upstream vento_mcp {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    location / {
        proxy_pass http://vento_mcp;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/vento-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
sudo certbot renew --dry-run
```

### Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp
sudo ufw enable
```

---

## Verify Deployment (All Platforms)

### Health Checks

```bash
# Liveness (no upstream calls)
curl https://your-url.com/health/live
→ {"status":"ready","uptimeMs":...}

# Readiness (pings Vento)
curl https://your-url.com/health
→ {"status":"ready","vento":{"connected":true,"latencyMs":...},"version":"0.2.0"}
```

### Test MCP Protocol

```bash
curl -X POST https://your-url.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 1
  }'
```

### Test Metrics

```bash
curl -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  https://your-url.com/metrics | head -20
```

### Test OAuth Flow

```bash
# 1. Start authorization
curl -L https://your-url.com/auth/vento/authorize
→ Redirects to Vento OAuth consent screen

# 2. After user clicks "Authorize", callback returns:
{"success": true, "sessionId": "abc123def456"}

# 3. Get token
curl https://your-url.com/auth/vento/token/abc123def456
→ {"accessToken": "...", "expiresAt": ...}
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | production | Environment |
| `LOG_LEVEL` | info | debug, info, warn, error |
| `MCP_TRANSPORT` | http | http or stdio |
| `MCP_AUTH_TOKEN` | (required) | Bearer token, 32+ chars |
| `VENTO_API_URL` | (required) | Your Vento instance URL |
| `VENTO_TOKEN` | (required) | Vento API token |
| `RATE_LIMIT_ENABLED` | true | Enable rate limiting |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | 60 | Minute limit per token |
| `RATE_LIMIT_BURST_PER_SECOND` | 10 | Second burst limit |
| `CACHE_TTL_SECONDS` | 30 | Board cache TTL |
| `OAUTH_ENABLED` | true | Enable OAuth 2.1 PKCE |
| `OAUTH_CLIENT_ID` | (optional) | OAuth client ID |
| `OAUTH_CLIENT_SECRET` | (optional) | OAuth client secret |
| `OAUTH_REDIRECT_URI` | (optional) | OAuth callback URL |
| `ALLOW_DESTRUCTIVE_TOOLS` | true | Allow action execution |
| `ALLOWED_TOOLS` | (empty) | CSV allowlist (empty = all) |
| `CORS_ORIGINS` | https://claude.ai | CSV of allowed CORS origins |

---

## Troubleshooting

### Connector doesn't respond

```bash
# Check if running
curl https://your-url.com/health/live

# If 503: Vento is unreachable
# Check: VENTO_API_URL and firewall

# If 401: Wrong auth token
# Check: MCP_AUTH_TOKEN is correct
```

### Vento connection failed

```bash
# Verify Vento URL is reachable
curl https://your-vento-url.com/health

# Check token has API access
# In Vento: Settings → API Keys → Verify token

# Check firewall/network access from VPS to Vento
```

### Rate limit too strict

```bash
# Increase limits in .env
RATE_LIMIT_REQUESTS_PER_MINUTE=120
RATE_LIMIT_BURST_PER_SECOND=20

# Redeploy (Railway/Render/Fly.io auto-restarts)
# Or restart systemd service:
sudo systemctl restart vento-remote-mcp
```

### OAuth token not refreshing

```bash
# Check token status
curl https://your-url.com/auth/vento/status/SESSION_ID \
  -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN"

# Token should refresh automatically at 5-min mark before expiration
# If refresh fails, revoke and re-authorize:
curl -X POST https://your-url.com/auth/vento/revoke/SESSION_ID
```

---

## Monitoring

### Prometheus Metrics

All platforms expose `/metrics` endpoint (requires `MCP_AUTH_TOKEN`):

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-url.com/metrics
```

Key metrics to monitor:
- `http_request_duration_ms` - Request latency
- `vento_api_calls_total` - Vento API call count by endpoint
- `mcp_tool_executions_total` - Tool execution count
- `auth_failures_total` - Failed auth attempts
- `rate_limited_requests_total` - Rate-limited requests
- `active_connections` - Active HTTP connections

### Logs

**Railway**: `railway logs` or dashboard  
**Render**: Dashboard → Logs  
**Fly.io**: `flyctl logs` or dashboard  
**Systemd**: `journalctl -u vento-remote-mcp -f`

---

## Scaling

### Railway
- Increase replicas in `railway.json`: `numReplicas: 3`
- Auto-scales based on memory/CPU

### Render
- Go to **Service** → **Auto-Deploy** → Configure
- Set max instances

### Fly.io
```bash
flyctl scale count 3
```

### Self-Hosted
- Run multiple instances behind Nginx load balancer
- Share Redis/PostgreSQL for token store (future enhancement)

---

## Security Checklist

- [ ] Strong `MCP_AUTH_TOKEN` (32+ chars, random)
- [ ] HTTPS enabled on all URLs
- [ ] `VENTO_TOKEN` stored in env vars (not in code)
- [ ] Firewall blocks direct port 3000 access
- [ ] Rate limiting enabled (`RATE_LIMIT_ENABLED=true`)
- [ ] Security headers present (check `/health`)
- [ ] OAuth secrets stored securely
- [ ] Regular log monitoring
- [ ] Token rotation schedule established
- [ ] Backups configured (if using database)

---

**Need help?** Open an issue on [GitHub](https://github.com/geromendez199/vento-remote-mcp/issues)
