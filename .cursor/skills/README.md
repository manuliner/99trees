# Cursor Skills

Canonical doc skills live here (SSOT). Invoke via `/docs-writer`, `/docs-sync`, `/docs-commit`, or `/docs-defrag` in Cursor or Claude Code.

## Documentation

| Skill | When to use |
|-------|-------------|
| `/docs-writer` | Regenerate `docs/AGENTS_ARCHITECTURE.md` or create an ADR |
| `/docs-sync` | Keep docs aligned with branches and PRs |
| `/docs-commit` | Pre-commit doc hygiene — check staged changes |
| `/docs-defrag` | Audit docs for drift, dead paths, and principle violations |

`docs-shared` holds shared verification scripts; invoke via the skills above.

Architecture detail: [`docs/AGENTS_ARCHITECTURE.md`](../../docs/AGENTS_ARCHITECTURE.md).

## Release

| Skill | Where | Role |
|-------|-------|------|
| **release** | `.cursor/skills/release/` | Version tags and release notes |

```bash
bash .cursor/skills/release/scripts/release-test.sh
bash .cursor/skills/release/scripts/release-prod.sh patch|minor|major
```
