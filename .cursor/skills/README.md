# Cursor Skills

Canonical doc skills live here (SSOT). Invoke via `/docs-write`, `/docs-verify`, `/docs-defrag`, or `/docs-commit` in Cursor or Claude Code.

Shared scripts and reference live in `_shared/` (not a selectable skill).

## Documentation

| Skill | When to use |
|-------|-------------|
| `/docs-write` | Author new leaves, ADRs, runbooks — regenerate `docs/AGENTS_ARCHITECTURE.md` |
| `/docs-verify` | Structural and MOC gate before commit or merge (`--scope=staged\|branch`) |
| `/docs-defrag` | Consolidate, prune, and fix doc drift |
| `/docs-commit` | Commit staged code via agent + catch doc-to-code drift |

Architecture detail: [`docs/AGENTS_ARCHITECTURE.md`](../../docs/AGENTS_ARCHITECTURE.md).

## Release

| Skill | Where | Role |
|-------|-------|------|
| **release** | `.cursor/skills/release/` | Version tags and release notes |

```bash
bash .cursor/skills/release/scripts/release-test.sh
bash .cursor/skills/release/scripts/release-prod.sh patch|minor|major
```
