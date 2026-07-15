#!/bin/bash
set -e

echo "🚀 Vento Remote MCP Connector - Quick Start"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js 20+ is required. Please install from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20+ required. You have v$(node -v)"
  exit 1
fi

echo "✓ Node.js $(node -v)"
echo ""

# Clone or use current directory
if [ ! -f "package.json" ]; then
  echo "📥 Cloning repository..."
  git clone https://github.com/geromendez199/vento-remote-mcp.git
  cd vento-remote-mcp
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Configuration"
echo "================"
echo ""
echo "Choose deployment method:"
echo "  1) Local development (default)"
echo "  2) Docker + Local Vento"
echo "  3) Railway cloud (recommended for production)"
echo ""
read -p "Enter choice (1-3) [1]: " DEPLOY_METHOD
DEPLOY_METHOD=${DEPLOY_METHOD:-1}

case $DEPLOY_METHOD in
  1)
    echo ""
    echo "📝 Local Development Setup"
    echo "=========================="
    ;;
  2)
    echo ""
    echo "🐳 Docker + Local Vento Setup"
    echo "============================"
    ;;
  3)
    echo ""
    echo "🚀 Railway Cloud Deployment"
    echo "==========================="
    echo ""
    echo "Visit: https://railway.app/new?templateId=vento-remote-mcp"
    echo ""
    echo "You'll be prompted to set these environment variables:"
    echo "  - VENTO_API_URL: Your Vento instance URL"
    echo "  - VENTO_TOKEN: Your Vento API token"
    echo "  - MCP_AUTH_TOKEN: Leave blank to generate automatically"
    echo ""
    echo "After deployment:"
    echo "  1. Copy your Railway app URL"
    echo "  2. Add to Claude: Settings → MCP → Add Server"
    echo "  3. Use your MCP_AUTH_TOKEN"
    echo ""
    exit 0
    ;;
  *)
    echo "❌ Invalid choice. Exiting."
    exit 1
    ;;
esac

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Created .env file"
  echo ""
  echo "⚠️  Please edit .env with your configuration:"
  echo ""
  echo "  Required:"
  echo "    VENTO_API_URL=https://your-vento-instance.com"
  echo "    VENTO_TOKEN=your-vento-api-token"
  echo "    MCP_AUTH_TOKEN=$(openssl rand -hex 32)"
  echo ""
  echo "  Optional (OAuth):"
  echo "    OAUTH_ENABLED=false"
  echo "    OAUTH_CLIENT_ID=your-oauth-client-id"
  echo "    OAUTH_CLIENT_SECRET=your-oauth-client-secret"
  echo ""
  read -p "Press Enter to edit .env in nano, or Ctrl+C to skip: "
  if command -v nano &> /dev/null; then
    nano .env
  elif command -v vi &> /dev/null; then
    vi .env
  else
    echo "No text editor found. Please edit .env manually."
  fi
  echo ""
else
  echo "✓ .env file already exists"
  echo ""
  read -p "Do you want to update .env? (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v nano &> /dev/null; then
      nano .env
    else
      vi .env
    fi
  fi
fi

echo ""
echo "🧪 Running quality checks..."
npm run type-check && echo "✓ Type checking passed" || (echo "❌ Type check failed" && exit 1)
npm run lint && echo "✓ Linting passed" || (echo "❌ Linting failed" && exit 1)

echo ""
echo "🔨 Building..."
npm run build && echo "✓ Build successful" || (echo "❌ Build failed" && exit 1)

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "==========="
echo ""

case $DEPLOY_METHOD in
  1)
    echo "Development (with hot reload):"
    echo "  npm run dev"
    echo ""
    echo "Then add to Claude:"
    echo "  • URL: http://localhost:3000"
    echo "  • Auth Token: Your MCP_AUTH_TOKEN from .env"
    echo ""
    ;;
  2)
    echo "Start with Docker:"
    echo "  docker compose up"
    echo ""
    echo "Then add to Claude:"
    echo "  • URL: http://localhost:3000"
    echo "  • Auth Token: Your MCP_AUTH_TOKEN from .env"
    echo ""
    ;;
esac

echo "Testing:"
echo "  npm test             # Run tests"
echo "  npm test -- --watch  # Watch mode"
echo ""
echo "Documentation:"
echo "  • README.md               - Main documentation"
echo "  • docs/deploy.md          - Deployment guides"
echo "  • docs/vento-api.md       - API reference"
echo "  • docs/oauth.md           - OAuth setup"
echo "  • quick-setup.md          - Quick reference"
echo "  • examples/usage.md       - Real-world examples"
echo ""
echo "🎯 Need help?"
echo "  • Issues: https://github.com/geromendez199/vento-remote-mcp/issues"
echo "  • Discussions: https://github.com/geromendez199/vento-remote-mcp/discussions"
echo ""
echo "Happy connecting! 🚀"
