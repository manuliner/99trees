#!/usr/bin/env bash
# Verifies that context documentation files exist and are within line limits.
# Exit 0 if OK, exit 1 if issues found.

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ERRORS=0

check_file() {
  local file="$ROOT/$1"
  local limit="${2:-0}"
  if [[ -f "$file" ]]; then
    if [[ $limit -gt 0 ]]; then
      local lines
      lines=$(wc -l < "$file")
      if [[ $lines -le $limit ]]; then
        echo "✅ $1 (${lines} lines)"
      else
        echo "⚠️  $1 (${lines} lines — exceeds recommended ${limit})"
      fi
    else
      echo "✅ $1"
    fi
  else
    echo "❌ $1 missing"
    ERRORS=1
  fi
}

echo "Checking context documentation..."
echo ""

echo "=== Layer 0/1: Always-loaded context ==="
check_file "AGENTS.md" 200
check_file "CLAUDE.md"

echo ""
echo "=== Layer 2: On-demand context ==="
check_file "ARCHITECTURE.md" 300
check_file "docs/AGENTS_ARCHITECTURE.md"
check_file "docs/AGENTS_SERVER.md"
check_file "docs/AGENTS_APP.md"

echo ""
echo "=== MDC Rules ==="
check_file ".cursor/rules/core.mdc"
check_file ".cursor/rules/main.mdc"
check_file ".cursor/rules/web.mdc"

echo ""
if [[ $ERRORS -eq 0 ]]; then
  echo "✅ All expected context docs present"
  exit 0
else
  echo "❌ Some context docs missing — run docs-bootstrap skill or fix paths"
  exit 1
fi

