#!/usr/bin/env bash
# Starts the mock AI and three app configurations, then runs the integration tests.
# Uses the webapp-testing skill's with_server.py to manage server lifecycles.
set -euo pipefail
cd "$(dirname "$0")/.."

WITH_SERVER=".claude/skills/webapp-testing/scripts/with_server.py"
MOCK="http://127.0.0.1:4010"
COMMON="NODE_ENV=production REPORT_SECRET=integration-test-secret-0123456789abcdef PAYMENT_MODE=demo HEALTH_TOKEN=health-token-for-tests-123456"
# Unset any ambient credentials/base URLs so only the mock is ever called.
CLEAN="env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN -u OPENAI_API_KEY -u OPENAI_BASE_URL -u DATABASE_URL"

[ -d .next ] || npm run build

python3 "$WITH_SERVER" \
  --server "exec node tests/mock-ai.mjs" --port 4010 \
  --server "exec $CLEAN $COMMON ANTHROPIC_API_KEY=sk-test-anthropic-SECRET ANTHROPIC_BASE_URL=$MOCK OPENAI_API_KEY=sk-test-openai-SECRET OPENAI_BASE_URL=$MOCK/v1 ALLOW_EMBEDDED_DB=1 node_modules/.bin/next start -p 3200" --port 3200 \
  --server "exec $CLEAN $COMMON OPENAI_API_KEY=sk-test-openai-SECRET OPENAI_BASE_URL=$MOCK/v1 ALLOW_EMBEDDED_DB=1 node_modules/.bin/next start -p 3201" --port 3201 \
  --server "exec $CLEAN $COMMON node_modules/.bin/next start -p 3202" --port 3202 \
  --timeout 90 \
  -- node --test --test-concurrency=1 tests/integration.test.mjs
