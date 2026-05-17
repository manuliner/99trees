#!/usr/bin/env bash
# Grep-based principle checks (complement LLM audit in docs-defrag).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
ISSUES=0

fail() {
  echo "❌ $1"
  ISSUES=1
}

warn() {
  echo "⚠️  $1"
}

echo "Principles grep checks..."
echo ""

# Stale pointers in always-applied rules
if grep -qE 'ARCHITECTURE\.md|docs/AGENTS_' "$ROOT/.cursor/rules/main.mdc" 2>/dev/null; then
  fail "main.mdc still references ARCHITECTURE.md or docs/AGENTS_*"
else
  echo "✅ main.mdc has no legacy doc pointers"
fi

# CLAUDE.md should not claim trilogy as primary
if grep -qE 'ARCHITECTURE\.md|docs/AGENTS_' "$ROOT/CLAUDE.md" 2>/dev/null; then
  fail "CLAUDE.md still references legacy agent codemaps"
else
  echo "✅ CLAUDE.md has no legacy codemap pointers"
fi

# AGENTS.md doc index
if grep -qE 'ARCHITECTURE\.md|docs/AGENTS_' "$ROOT/AGENTS.md" 2>/dev/null; then
  fail "AGENTS.md still references ARCHITECTURE.md or docs/AGENTS_*"
else
  echo "✅ AGENTS.md has no legacy doc pointers"
fi

# Duplicate skill registration
if [[ -d "$ROOT/.cursor/skills/global-docs-init" ]]; then
  fail "global-docs-init directory still exists"
fi

for dup in docs-sync docs-commit; do
  count=$(find "$ROOT/.cursor/skills" -path "*/bundle/$dup/SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$count" -gt 0 ]]; then
    fail "bundle duplicate skill: $dup"
  fi
done

template_skills=$(find "$ROOT/.cursor/skills" -path "*/templates/*/SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
if [[ "$template_skills" -gt 0 ]]; then
  fail "templates/*/SKILL.md still present (rename to skill.template.md)"
else
  echo "✅ no invokable template SKILL.md under .cursor/skills"
fi

if [[ -f "$ROOT/.cursor/skills/_vendor/docs-init/SKILL.md" ]]; then
  fail "_vendor/docs-init/SKILL.md still present (use docs-init.skill.template.md)"
else
  echo "✅ vendor docs-init not registered as project skill"
fi

# Optional: BirdBoard dead reference in agent docs (not product SCOPE)
if grep -rq 'BirdBoard' "$ROOT/AGENTS.md" "$ROOT/web/README.md" "$ROOT/.vibe/docs" 2>/dev/null; then
  warn "BirdBoard mentioned in agent docs (likely stale — use GameBoard)"
fi

echo ""
if [[ $ISSUES -eq 0 ]]; then
  echo "✅ Principles grep checks passed"
  exit 0
else
  echo "❌ Principles grep checks failed"
  exit 1
fi
