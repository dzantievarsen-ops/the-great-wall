#!/bin/bash
set -e

cd "$(dirname "$0")/.."

echo "Running The Great Wall pipeline..."
pnpm gather "$@"
