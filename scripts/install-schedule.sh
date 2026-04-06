#!/bin/bash
set -e

echo "Installing The Great Wall schedule (Monday + Friday 07:00)..."
cd "$(dirname "$0")/.."
pnpm tsx packages/core/src/scheduler/launchd.ts install
echo "Done. Check: launchctl list | grep greatwall"
