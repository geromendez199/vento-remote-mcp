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

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "✓ Created .env file"
  echo ""
  echo "⚠️  Edit .env with your configuration:"
  echo "   - MCP_AUTH_TOKEN: $(openssl rand -hex 32)"
  echo "   - VENTO_API_URL: Your Vento instance URL"
  echo "   - VENTO_TOKEN: Your Vento API token"
  echo ""
  nano .env
else
  echo "✓ .env file already exists"
fi

echo ""
echo "🧪 Running quality checks..."
npm run type-check
npm run lint

echo ""
echo "🔨 Building..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "==========="
echo ""
echo "Development:"
echo "  npm run dev          # Start with hot reload"
echo ""
echo "Testing:"
echo "  npm test             # Run tests"
echo "  npm test -- --watch  # Watch mode"
echo ""
echo "Docker:"
echo "  docker compose up    # Start with Vento instance"
echo ""
echo "Production:"
echo "  npm start            # Run production build"
echo "  export MCP_TRANSPORT=http  # Use HTTP mode"
echo "  npm start"
echo ""
echo "Documentation:"
echo "  cat README.md              # Main documentation"
echo "  cat docs/deploy.md         # Deployment guides"
echo "  cat docs/vento-api.md      # API reference"
echo ""
echo "🎯 Need help? Check: https://github.com/geromendez199/vento-remote-mcp#readme"
