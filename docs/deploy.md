# Deployment Guide

This guide covers deploying Vento Remote MCP Connector to various platforms.

## Prerequisites

- Node.js 20+ installed locally (for builds)
- A Vento instance running (local or cloud)
- Vento API token
- Generated MCP auth token: `openssl rand -hex 32`

## Option 1: Docker (Recommended)

### Local Development

```bash
# Clone and setup
git clone https://github.com/geromendez199/vento-remote-mcp.git
cd vento-remote-mcp

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run with Docker Compose (includes local Vento instance)
docker compose up
```

The connector will be available at `http://localhost:3000`

### Production Docker

```bash
# Build image
docker build -t vento-remote-mcp:latest .

# Run with environment variables
docker run -p 3000:3000 \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  -e MCP_AUTH_TOKEN=your-secure-token \
  -e VENTO_API_URL=https://your-vento-instance.com \
  -e VENTO_TOKEN=your-vento-token \
  -e MCP_TRANSPORT=http \
  vento-remote-mcp:latest
```

## Option 2: Railway

Railway offers free tier and simple deployment from GitHub.

### Steps

1. Create account at [railway.app](https://railway.app)
2. Click **Deploy on Railway** button (or manual setup):
3. Connect your GitHub repository
4. Add environment variables in Railway dashboard:
   - `MCP_AUTH_TOKEN`: Generated token
   - `VENTO_API_URL`: Your Vento URL
   - `VENTO_TOKEN`: Your Vento API token
   - `NODE_ENV`: `production`
5. Deploy

Railway automatically assigns a public domain. Your connector URL is: `https://your-project.up.railway.app`

## Option 3: Render

Render offers free tier with auto-deploys from GitHub.

### Steps

1. Create account at [render.com](https://render.com)
2. Click **Deploy to Render** button or:
3. Create new **Web Service**
4. Connect GitHub repository
5. Configure:
   - **Name**: vento-remote-mcp
   - **Environment**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Environment Variables**: (same as Railway)
6. Deploy

Render provides a free domain. Your connector URL is: `https://vento-remote-mcp.onrender.com`

## Option 4: Fly.io

Fly.io offers generous free tier and fast deployments globally.

### Steps

1. Install Fly CLI: [flyctl](https://fly.io/docs/getting-started/installing-flyctl/)
2. Create account and authenticate: `fly auth signup`
3. Launch application:
   ```bash
   fly launch --repo https://github.com/geromendez199/vento-remote-mcp
   ```
4. Set secrets:
   ```bash
   fly secrets set MCP_AUTH_TOKEN=your-secure-token
   fly secrets set VENTO_API_URL=https://your-vento-instance.com
   fly secrets set VENTO_TOKEN=your-vento-token
   fly secrets set NODE_ENV=production
   ```
5. Deploy:
   ```bash
   fly deploy
   ```
6. View status: `fly status`
7. View logs: `fly logs`

Your connector URL is: `https://vento-remote-mcp.fly.dev`

## Option 5: VPS + Systemd

For maximum control on your own VPS or server.

### Prerequisites

- Ubuntu 20.04+ or similar Linux
- SSH access
- Node.js 20+ installed
- Nginx or similar reverse proxy (optional but recommended)

### Installation

```bash
# SSH into your server
ssh user@your-vps.com

# Clone repository
git clone https://github.com/geromendez199/vento-remote-mcp.git /opt/vento-remote-mcp
cd /opt/vento-remote-mcp

# Install dependencies
npm ci --production

# Build
npm run build

# Create .env file
cp .env.example .env
# Edit with your credentials
nano .env

# Create systemd service
sudo tee /etc/systemd/system/vento-remote-mcp.service > /dev/null <<EOF
[Unit]
Description=Vento Remote MCP Connector
After=network.target

[Service]
Type=simple
User=nobody
WorkingDirectory=/opt/vento-remote-mcp
EnvironmentFile=/opt/vento-remote-mcp/.env
ExecStart=/usr/bin/node /opt/vento-remote-mcp/dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl enable vento-remote-mcp
sudo systemctl start vento-remote-mcp

# Check status
sudo systemctl status vento-remote-mcp
```

### Nginx Reverse Proxy (Optional)

For HTTPS and better performance, use Nginx:

```bash
sudo tee /etc/nginx/sites-available/vento-remote-mcp > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/vento-remote-mcp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

Add HTTPS with Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u vento-remote-mcp -f

# Last 50 lines
sudo journalctl -u vento-remote-mcp -n 50
```

## Option 6: VPS + Cloudflared Tunnel

For secure remote access without public IP or domain.

### Prerequisites

- VPS with Vento Remote MCP running
- Cloudflare account
- `cloudflared` CLI installed

### Steps

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create vento-mcp

# Create config file
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<EOF
tunnel: vento-mcp
credentials-file: /root/.cloudflared/vento-mcp.json

ingress:
  - hostname: vento-mcp.your-domain.com
    service: http://localhost:3000
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns vento-mcp vento-mcp.your-domain.com

# Run tunnel
cloudflared tunnel run vento-mcp
```

Or as systemd service:

```bash
sudo cp /usr/local/bin/cloudflared /usr/local/bin/cloudflared
sudo tee /etc/systemd/system/cloudflared.service > /dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
TimeoutStartSec=0
Type=notify
ExecStart=/usr/local/bin/cloudflared tunnel run --token <YOUR_TOKEN>
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

## Environment Variables

All deployments require these environment variables:

```env
# Required
MCP_AUTH_TOKEN=<32+ char random token>
VENTO_API_URL=http://localhost:8000
VENTO_TOKEN=<your-vento-api-token>

# Optional
PORT=3000
LOG_LEVEL=info
NODE_ENV=production
MCP_TRANSPORT=http
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

## Verification

After deployment, verify the connector is running:

```bash
# Health check
curl https://your-connector-url.com/health

# Info endpoint (with auth)
curl -H "Authorization: Bearer YOUR_MCP_AUTH_TOKEN" \
  https://your-connector-url.com/info
```

## Troubleshooting

### Connector not responding

1. Check service status:
   ```bash
   sudo systemctl status vento-remote-mcp
   ```

2. Check logs:
   ```bash
   sudo journalctl -u vento-remote-mcp -n 100
   ```

3. Verify environment variables are set
4. Check firewall rules allow traffic on port 3000

### Can't connect to Vento

1. Verify `VENTO_API_URL` is correct and accessible
2. Test connectivity:
   ```bash
   curl -H "Authorization: Bearer $VENTO_TOKEN" \
     https://vento-url/api/boards/v1
   ```
3. Ensure `VENTO_TOKEN` is valid

### Claude can't connect

1. Verify connector URL is publicly accessible
2. Verify auth token in Claude settings matches `MCP_AUTH_TOKEN`
3. Check browser console for error messages
4. Wait 1-2 minutes for Claude to sync

## Monitoring

### Health Check Script

```bash
#!/bin/bash
# check-health.sh

CONNECTOR_URL="https://your-connector-url.com"
AUTH_TOKEN="your-mcp-auth-token"

# Check health endpoint
if curl -f "$CONNECTOR_URL/health" > /dev/null 2>&1; then
  echo "✓ Connector is healthy"
else
  echo "✗ Connector is not responding"
  exit 1
fi

# Check MCP endpoint
if curl -f -X POST "$CONNECTOR_URL/mcp" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' > /dev/null 2>&1; then
  echo "✓ MCP endpoint is working"
else
  echo "✗ MCP endpoint is not responding"
  exit 1
fi
```

Run periodically with cron or monitoring service.

## Scaling

For high traffic, consider:

1. **Load Balancing**: Deploy multiple instances behind a load balancer
2. **Caching**: Add Redis for response caching
3. **Database**: Use PostgreSQL for persistent logging
4. **Monitoring**: Add Prometheus/Grafana for metrics

See `docs/architecture.md` for scaling patterns.

## Updates

To update to a new version:

### Docker

```bash
docker pull ghcr.io/geromendez199/vento-remote-mcp:latest
docker compose up -d
```

### Systemd

```bash
cd /opt/vento-remote-mcp
git pull
npm ci
npm run build
sudo systemctl restart vento-remote-mcp
```

## Support

- **Issues**: [GitHub Issues](https://github.com/geromendez199/vento-remote-mcp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/geromendez199/vento-remote-mcp/discussions)
- **Discord**: [Vento Discord](https://discord.gg/VpeZxMFfYW)
