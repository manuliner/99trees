---
name: docs-defrag
description: Consolidate, archive, or merge docs; remove orphaned paths while preserving MOC coherence.
---

# docs-defrag

## Workflow

1. Inventory leaves via MOC; mark candidates for merge/archive.
2. Run `check-dead-paths.sh` after moves; fix broken relative links.
3. Re-run `verify-docs-principles.sh` to ensure hubs still resolve.

## Scripts

- `scripts/verify-docs-principles.sh`
- `scripts/check-dead-paths.sh`
