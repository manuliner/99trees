---
name: docs-sync
description: Keep documentation aligned with branches and PRs; run MOC-aware verification before merge.
---

# docs-sync

## Workflow

1. Load L1 MOC; identify files touched by the branch.
2. Run `scripts/verify-docs-principles.sh` (MOC links) and shared `scripts/verify-docs.sh`.
3. Update indices only when new leaves are added.

## Scripts

- `scripts/verify-docs-principles.sh` — MOC pattern gate
- `scripts/check-dead-paths.sh` — dead relative links in `docs/**`

## Canonical set

Part of the **five** repo skills; do not add `hybrid` / `docs-update` / `docs-concepts`.
