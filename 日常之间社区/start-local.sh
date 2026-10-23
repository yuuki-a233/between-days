#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
export NEXT_TELEMETRY_DISABLED=1
node -e 'const [a,b]=process.versions.node.split(".").map(Number);if(a<24||(a===24&&b<15))throw new Error("Node.js 24.15+ required")'
if [ ! -f node_modules/next/package.json ]; then
 node vendor/npm/bin/npm-cli.js ci --no-audit --no-fund
fi
exec node scripts/launch.mjs dev
