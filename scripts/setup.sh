#!/bin/bash
set -e

echo "========================================="
echo "  The Great Wall — Setup"
echo "========================================="

cd "$(dirname "$0")/.."

# Install dependencies
echo "[1/3] Installing dependencies..."
pnpm install

# Create data directories
echo "[2/3] Creating data directories..."
mkdir -p data/{reports/{digests,comprehensive},cache,logs}

# Check for .env
if [ ! -f .env ]; then
  echo "[3/3] Creating .env from template..."
  cp .env.example .env
  echo ""
  echo "⚠  Please edit .env with your API keys:"
  echo "   - ANTHROPIC_API_KEY (required)"
  echo "   - VOYAGER_PATH (required)"
  echo "   - RESEND_API_KEY (for email)"
  echo "   - NOTIFICATION_EMAIL (for email)"
else
  echo "[3/3] .env already exists."
fi

echo ""
echo "Setup complete. Run: pnpm gather --dry-run"
