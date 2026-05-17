---
name: docs-init
description: >
  Bootstrap hybrid agent docs: migrate legacy ARCHITECTURE/codemaps, scaffold skills,
  docs-update --full, docs-concepts, slim AGENTS.md, docs-defrag gate. Install:
  bash .cursor/skills/_vendor/docs-init/install.sh
disable-model-invocation: true
---

# Docs init (global)

**Role:** One-time (or rare) **hybrid documentation bootstrap** for a repo.

| Location | What |
|----------|------|
| **This skill** | `~/.cursor/skills/docs-init/` after install |
| **Per repo** | `.cursor/skills/{docs-shared,docs-sync,docs-commit,docs-update,docs-concepts,docs-defrag}` + rules + `AGENTS.md` |

**Not for:** ongoing patches → **docs-sync**; module regen → **docs-update**; commits → **docs-commit**.

---

## Phase 0 — Install (once per machine)

From a vendor repo (e.g. 99trees):

```bash
bash .cursor/skills/_vendor/docs-init/install.sh
```

---

## Phase 1 — Research

Read [`reference/research.md`](reference/research.md). Build a **project profile** (package manager, app root e.g. `web/`, ports, session model). Do not skip.

---

## Phase 2 — Scaffold project skills

If `.cursor/skills/docs-sync/` missing, copy from `templates/`:

```bash
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TPL="${DOCS_INIT_BUNDLE:-$HOME/.cursor/skills/docs-init/templates}"
for skill in docs-shared docs-sync docs-commit docs-update docs-concepts docs-defrag; do
  [[ -d "$TPL/$skill" ]] && cp -r "$TPL/$skill" "$REPO_ROOT/.cursor/skills/"
done
```

Merge if skills exist (do not overwrite user edits). Ensure `.cursor/skills/README.md` lists seven doc skills + release.

---

## Phase 3 — Legacy migration (if old trilogy present)

If `ARCHITECTURE.md` or `docs/AGENTS_*.md` exist:

1. Merge facts into `.vibe/docs/architecture.md`, `dependency-graph.md`, and relevant `web/**/README.md`.
2. Rewrite **Doc index** in `AGENTS.md` → `web/README.md`, `.vibe/docs/`, `docs/SCOPE.md` (no legacy paths).
3. Update `.cursor/rules/main.mdc` pointers.
4. **Delete:** `ARCHITECTURE.md`, `docs/AGENTS_ARCHITECTURE.md`, `docs/AGENTS_APP.md`, `docs/AGENTS_SERVER.md`.

---

## Phase 4 — Vibe generation

1. **docs-update** with `--full` on app root (e.g. `web/`).
2. **docs-concepts** — regenerate `.vibe/docs/`.
3. Slim **`AGENTS.md`** (commands, invariants, doc index only — ≤200 lines).
4. **`CLAUDE.md`** — short block pointing to `AGENTS.md`, `web/README.md`, `.vibe/docs/`.

---

## Phase 5 — Defrag gate

Run **docs-defrag** (verify scripts + principles report). Init is not complete until blocking findings are resolved.

Optional: configure `code-index-mcp` in `.cursor/mcp.json`.

---

## Phase 6 — Rules

Follow [`reference/rules-templates.md`](reference/rules-templates.md). Patch `core.mdc` / `main.mdc`; preserve user custom rules.

---

## Interference guards

- Do **not** use **create-rule** or **migrate-to-skills** for agent context — use this skill + **docs-sync**.
- **docs-canvas** is presentation only, not source of truth.

---

## Verify

```bash
bash .cursor/skills/docs-shared/scripts/verify-docs.sh
```

Report: created vs updated, profile summary, reinstall path for global skill.
