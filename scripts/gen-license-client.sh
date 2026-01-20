#!/usr/bin/env bash
set -euo pipefail

# Generates TypeScript types from docs/license-openapi.yaml using openapi-typescript
# Usage: ./scripts/gen-license-client.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SPEC="$ROOT_DIR/docs/license-openapi.yaml"
OUT="$ROOT_DIR/apps/desktop/src/lib/license/types.generated.ts"

echo "Generating TypeScript types from $SPEC -> $OUT"

# Prefer npx/openapi-typescript installed locally or via npx
if ! command -v npx >/dev/null 2>&1; then
  echo "npx not found. Please install Node.js (>=16) and corepack/pnpm or use npx from npm." >&2
  exit 1
fi

npx --yes openapi-typescript "$SPEC" --output "$OUT"

echo "Generated $OUT"
