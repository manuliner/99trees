---
name: docs-commit
description: Commit and changelog discipline for documentation changes; principle checks on staged paths.
---

# docs-commit

## Workflow

1. Ensure MOC entries point at new/changed leaves (`verify-docs-principles.sh`).
2. Run `check-dead-paths.sh` when markdown under `docs/` changed.
3. Reference `docs-shared` scripts for full structural verify on release branches.

## Scripts

- `scripts/verify-docs-principles.sh`
- `scripts/check-dead-paths.sh`
