#!/bin/bash
set -e

echo "Uninstalling The Great Wall schedule..."
cd "$(dirname "$0")/.."
pnpm tsx packages/core/src/scheduler/launchd.ts uninstall
echo "Done."
