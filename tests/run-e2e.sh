#!/usr/bin/env bash
# Browser E2E against a production build with the mock AI (webapp-testing skill).
set -euo pipefail
cd "$(dirname "$0")/.."

WITH_SERVER=".claude/skills/webapp-testing/scripts/with_server.py"
MOCK="http://127.0.0.1:4010"
CLEAN="env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN -u OPENAI_API_KEY -u OPENAI_BASE_URL -u DATABASE_URL"

[ -d .next ] || npm run build

python3 "$WITH_SERVER" \
  --server "exec node tests/mock-ai.mjs" --port 4010 \
  --server "exec $CLEAN NODE_ENV=production REPORT_SECRET=e2e-test-secret-0123456789abcdefghij ANTHROPIC_API_KEY=sk-test-anthropic-SECRET ANTHROPIC_BASE_URL=$MOCK OPENAI_API_KEY=sk-test-openai-SECRET OPENAI_BASE_URL=$MOCK/v1 ALLOW_EMBEDDED_DB=1 node_modules/.bin/next start -p 3300" --port 3300 \
  --server "exec $CLEAN NODE_ENV=production REPORT_SECRET=e2e-test-secret-0123456789abcdefghij node_modules/.bin/next start -p 3301" --port 3301 \
  --timeout 90 \
  -- python3 tests/e2e.py
