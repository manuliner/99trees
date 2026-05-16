---
name: docs-bootstrap
description: >
  Synchronizes context documentation with the codebase: AGENTS.md,
  ARCHITECTURE.md, docs/AGENTS_*.md, .cursor/rules/, and keeps pointers accurate.
  Use after refactors, when docs drift, or when asked to "sync docs" or "update context".
  Run verify script manually (no CI automation required).
---

# Docs bootstrap

Keeps all context layers synchronized with the current codebase.

## Scope (this repo)

- Layer 1: `AGENTS.md`
- Layer 2: `ARCHITECTURE.md`, `docs/AGENTS_*.md`
- Rules: `.cursor/rules/*.mdc`

Format reference:

@../docs-writer/reference/agent-context-files.md

---

## Step 1 — Read current codebase state

Collect facts to compare against docs:

1. `package.json` — dependencies + scripts
2. `web/server/database/schema.ts` — data models
3. `web/server/` — routes, middleware, plugins (list dirs; read changed areas only)
4. `web/app/` — notable pages, components, composables, stores
5. `web/shared/` — contracts/transforms used by app and server

Do NOT read entire large files — use listings and targeted reads.

---

## Step 2 — Update Layer-1 doc (`AGENTS.md`)

- Commands match `package.json`
- Structure section matches actual directories
- Invariants + gotchas reflect current reality (shift import constraints, auth, env)

Line target: `AGENTS.md` ≤200 lines if possible.

---

## Step 3 — Update Layer-2 docs

- `ARCHITECTURE.md`: only update Mermaid / invariants when boundaries or cross-cutting concerns changed.
- `docs/AGENTS_*.md`: keep codemaps accurate (“where to change X” pointers).

---

## Step 4 — Verify (manual)

From repo root:

```bash
bash .cursor/skills/docs-bootstrap/scripts/verify-docs.sh
```

Exit 0 = expected files present (and line-limit hints). Exit 1 = fix missing paths or run this skill again.

---

## Notes

- Edit only changed sections — avoid wholesale rewrites
- Prefer accuracy over completeness; remove stale paths

