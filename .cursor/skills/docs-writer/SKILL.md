---
name: docs-writer
description: Author new docs, ADRs, and runbooks using MOC-first structure and shared verification scripts.
---

# docs-writer

## Workflow

1. Pick doc type via `reference/doc-type-selector.md` (after scaffold).
2. Create leaf under `docs/`; add one line + link to nearest MOC hub.
3. Run `scripts/verify-docs.sh` and `check-auto-sections.sh` if profile defines `autoSections`.

## Notes

Uses shared scripts from `docs-shared` copied at scaffold time; no duplicate `verify-docs-principles` required for authoring-only tasks.
