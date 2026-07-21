#!/bin/bash
set -e

echo ""
echo "⚡ E2E Studio — Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check Claude CLI
if ! command -v claude &> /dev/null; then
  echo "⚠️  'claude' CLI not found in PATH."
  echo "   Install Claude Code from: https://claude.ai/download"
  echo "   Then run: claude --version"
  echo ""
fi

# Check Node
NODE_VER=$(node -v 2>/dev/null || echo "not found")
echo "→ Node.js: $NODE_VER"

# Install server deps
echo "→ Installing server dependencies..."
npm install

# Install UI deps
echo "→ Installing UI dependencies..."
cd ui && npm install && cd ..

# Install Playwright
echo "→ Installing Playwright..."
cd ui && npx playwright install --with-deps chromium 2>/dev/null || true && cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start the app:"
echo "  Terminal 1:  npm start          (API server, port 3001)"
echo "  Terminal 2:  cd ui && npm run dev   (UI dev server, port 5173)"
echo ""
echo "Or build the UI once and run just the server:"
echo "  npm run build && npm start"
echo "  → Open http://localhost:3001"
echo ""
