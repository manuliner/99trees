---
name: docs-concepts
description: >
  Generate or update .vibe/docs/ concept docs from web/**/README.md only (no .ts reads).
  architecture.md, requirements.md, design.md, optional flow docs.
---

# Docs concepts

**Role:** Cross-module **concept docs** in `.vibe/docs/`. Never read `.ts` / `.vue` source — use module READMEs only.

**Boundary:** `.vibe/docs/` only. Module READMEs → **docs-update** first if missing.

---

## Step 1 — Incremental skip

If `.vibe/docs/.docs-trace.json` has `commit` and no `web/**/README.md` changed since that commit → report up to date and stop.

---

## Step 2 — Understand system

From `web/README.md` + all `web/**/README.md` (and optional file tree listing only):

- Major components, data/control flow, patterns, extension points.

---

## Step 3 — Canonical docs (max ~40 lines each, dense, no source code fences)

| File | Content |
|------|---------|
| `architecture.md` | Goals, scope, building blocks, runtime view, crosscutting, key decisions |
| `requirements.md` | REQ-* EARS-style functional requirements |
| `design.md` | Naming, errors, patterns, boundaries, quality attributes |
| `dependency-graph.md` | Compact module → module graph (optional if not stale) |
| `*-flow.md` | User flows crossing 3+ modules (e.g. `play-flow.md`) |

`mkdir -p .vibe/docs` if needed.

---

## Step 4 — Trace

Write `.vibe/docs/.docs-trace.json`:

```json
{
  "commit": "<HEAD>",
  "createdAt": "<preserve or now>",
  "updatedAt": "<now>",
  "files": ["<md files written>"],
  "dependsOn": ["<web/**/README.md paths read>"]
}
```

---

## Step 5 — Summarize

New vs updated files; whether skip applied. No confirmation prompt.
