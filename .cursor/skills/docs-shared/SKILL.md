---
name: docs-shared
description: Shared documentation verification scripts, references, and MOC helpers used by docs-sync / docs-commit / docs-defrag / docs-writer.
---

# docs-shared

## Responsibilities

- Run `scripts/verify-docs.sh` for structural gates (profile, L1/L3, five skills, rules, forbidden paths, Claude symlinks).
- Run `scripts/check-auto-sections.sh` after profile changes to headings maps.
- Keep `reference/` aligned with repo architecture notes.

## Quick commands

```bash
./scripts/verify-docs.sh
./scripts/check-auto-sections.sh
```

## Canonical tree

Exactly **five** skills: `docs-shared`, `docs-sync`, `docs-commit`, `docs-defrag`, `docs-writer`.

## References

See `README.md`, `reference/`, and sibling skills for workflow-specific SKILL files.
