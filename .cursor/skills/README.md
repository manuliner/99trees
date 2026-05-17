# Reusable Skills

Scripts live at `.cursor/skills/{skill-name}/scripts/`. Run from project root.

## Doc skills (seven + release)

| Skill | Where | Role |
|-------|-------|------|
| **docs-init** | Global `~/.cursor/skills/docs-init` | Bootstrap, legacy migration, vibe generation |
| **docs-shared** | `.cursor/skills/docs-shared/` | SSOT principles (reference only) |
| **docs-sync** | `.cursor/skills/docs-sync/` | Factual patches after code changes |
| **docs-commit** | `.cursor/skills/docs-commit/` | Logical commits + changelog + doc gate |
| **docs-update** | `.cursor/skills/docs-update/` | Regen `web/**/README.md` + traces |
| **docs-concepts** | `.cursor/skills/docs-concepts/` | Regen `.vibe/docs/` from READMEs |
| **docs-defrag** | `.cursor/skills/docs-defrag/` | Principles audit + verify scripts |
| **release** | `.cursor/skills/release/` | Version tags and release notes |

**Install global docs-init (once):**

```bash
bash .cursor/skills/_vendor/docs-init/install.sh
```

Vendor templates use `skill.template.md` (not `SKILL.md`) so Cursor does not register duplicate skills from `_vendor/docs-init/templates/`. Reload the window after install if slash-command suggestions look stale.

**Former names:** `docs-writer` → docs-init, `docs-bootstrap` → docs-sync, `docs-commit-check` → docs-commit, `global-docs-init` → `_vendor/docs-init`

## Verify documentation layout

```bash
bash .cursor/skills/docs-shared/scripts/verify-docs.sh
bash .cursor/skills/docs-defrag/scripts/verify-docs-principles.sh
```

## Copy skills to another project

```bash
cp -r .cursor/skills/{docs-shared,docs-sync,docs-commit,docs-update,docs-concepts,docs-defrag,release} /path/to/project/.cursor/skills/
```

Then run `bash .cursor/skills/_vendor/docs-init/install.sh` on your machine if global init is not installed.

## Prerequisites

| Skill | Requirements |
|-------|----------------|
| **release** | Node.js, pnpm, Git, GitHub Actions |
| **docs-init** | Vendor install script; target repo with `web/` or detected app root |
| **docs-sync** | Hybrid layout: `AGENTS.md`, `web/README.md`, `.vibe/docs/architecture.md` |
| **docs-commit** | `change_notes.md` at repo root |

## Script paths

| Skill | Script |
|-------|--------|
| release (test) | `bash .cursor/skills/release/scripts/release-test.sh` |
| release (prod) | `bash .cursor/skills/release/scripts/release-prod.sh patch\|minor\|major` |
| docs-commit | `bash .cursor/skills/docs-commit/scripts/change-notes-template.sh` |
| verify docs | `bash .cursor/skills/docs-shared/scripts/verify-docs.sh` |
