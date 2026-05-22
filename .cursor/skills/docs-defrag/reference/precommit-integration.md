# Pre-commit integration

## Recommended hooks

- `scripts/verify-docs.sh` (repo root or skill copy) — structural gate
- `scripts/verify-docs-principles.sh` — MOC/link principles (from `docs-sync` / sibling)
- `scripts/check-dead-paths.sh` — relative link scan in `docs/**`

## Example (local)

```yaml
repos:
  - repo: local
    hooks:
      - id: verify-docs
        name: verify-docs
        entry: bash .cursor/skills/docs-shared/scripts/verify-docs.sh
        language: system
        pass_filenames: false
```

Point `entry` at the path used after scaffold (files are duplicated per skill; pick one canonical copy, e.g. under `docs-shared`).
