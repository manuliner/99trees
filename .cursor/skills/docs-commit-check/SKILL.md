---
name: docs-commit-check
description: Splits work into small logical commits and updates the changelog draft (change_notes.md or project equivalent) for each change. Keeps agent docs in sync when commits touch relevant areas. Use when the user asks to commit, create commits in logical packages, update changenotes, or prepare a release-note entry.
---

# Docs commit check

Commit in small logical units and add each change to the changelog draft.

## Reuse

- **Project skill**: `.cursor/skills/docs-commit-check/scripts/change-notes-template.sh`
- **Personal skill**: `~/.cursor/skills/docs-commit-check/scripts/change-notes-template.sh`

## Rules

- **Only commit on explicit request** (e.g. "commit", "committe das"). Never auto-commit.
- Each commit = one logical unit (one fix, one feature, one improvement).
- **For each commit** add an entry to the changelog draft in the correct section.
- **Agent docs** (`AGENTS.md`, `ARCHITECTURE.md`, `docs/AGENTS_*.md`): before completing a commit, review whether the staged change makes any of these files factually wrong. If yes, update the relevant doc(s) **in the same commit**. If not, do not add noise.

## Agent docs — when to update which file

| If the commit changes… | Update |
|------------------------|--------|
| Commands, repo structure, invariants, gotchas | `AGENTS.md` |
| Container-level architecture, middleware/plugins, boundary rules | `ARCHITECTURE.md` |
| Layering/boundaries, “where to change X” pointers | `docs/AGENTS_ARCHITECTURE.md` |
| API routes, middleware, plugins, DB workflow, shift import backend | `docs/AGENTS_SERVER.md` |
| UI/components/composables, shift import wizard UI | `docs/AGENTS_APP.md` |

## Workflow

1. Identify logical units — group changes by topic.
2. Per unit: stage files → review doc impact (table above) → add changelog entry → commit (when user requested).

## Changelog Sections

| Change type        | Section              |
|--------------------|----------------------|
| New feature        | 🎉 What's New        |
| Bugfix             | 🐛 Bug Fixes         |
| Refactor/improvement | 🔧 Improvements    |
| Documentation      | 📚 Documentation     |
| Breaking change    | ⚠️ Breaking Changes  |

## Format

- One line per entry as bullet under the right heading.
- Example: `- Fixed shift import preview rejecting legacy column name`

## Script

When creating or unsure of changelog structure, execute:

```bash
bash .cursor/skills/docs-commit-check/scripts/change-notes-template.sh
```

