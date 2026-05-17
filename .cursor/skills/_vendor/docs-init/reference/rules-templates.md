# Cursor rules templates (docs-init)

Generate **only** rules the project needs. Prefer `alwaysApply: true` for ≤3 small files.

## `core.mdc` (recommended everywhere)

Security + git invariants — adapt project name in title:

- Never auto-commit; never `--no-verify`; never force-push main/tags
- Never commit `.env` or read secrets unless user asks for a specific line
- Stack-specific: no client secrets, no server imports in frontend, etc.

## `main.mdc` (recommended)

Pointers only — no duplicate of `AGENTS.md`:

```markdown
---
alwaysApply: true
---

# Project context — {PROJECT_NAME}

- **Commands & invariants:** [`AGENTS.md`](../../AGENTS.md)
- **Module map:** [`web/README.md`](../../web/README.md)
- **Architecture & flows:** [`.vibe/docs/`](../../.vibe/docs/)
- **Product spec:** [`docs/SCOPE.md`](../../docs/SCOPE.md)
```

Adjust relative links if layout differs (e.g. app root not `web/`).

## Area rules (optional)

| Trigger | File | Example |
|---------|------|---------|
| Frontend UI conventions | `web.mdc` | English copy, design tokens path |
| API-only backend | `server.mdc` | Thin handlers, services layer |
| SQL/migrations | `database.mdc` | migrate command, no raw SQL in app |

## Do not

- Paste full codemaps into `.mdc` (use `web/**/README.md` and `.vibe/docs/`)
- Recreate `ARCHITECTURE.md` or `docs/AGENTS_*.md`
- Exceed ~30 lines per rule file when possible
