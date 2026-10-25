#!/usr/bin/env bash
# Low-end phone performance budget against a production build (webapp-testing skill).
set -euo pipefail
cd "$(dirname "$0")/.."
WITH_SERVER="../.claude/skills/webapp-testing/scripts/with_server.py"
CLEAN="env -u ANTHROPIC_API_KEY -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN -u OPENAI_API_KEY -u OPENAI_BASE_URL -u DATABASE_URL"
[ -d .next ] || npm run build
python3 "$WITH_SERVER" \
  --server "exec $CLEAN NODE_ENV=production REPORT_SECRET=perf-test-secret-0123456789abcdefghijk node_modules/.bin/next start -p 3300" --port 3300 \
  --timeout 90 -- python3 tests/perf.py
