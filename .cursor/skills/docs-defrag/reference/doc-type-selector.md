# Doc type selector (MOC routing)

## Agent reading order

1. **`AGENTS.md`** — commands, env, critical invariants (every session via `CLAUDE.md`)
2. **`docs/AGENTS_ARCHITECTURE.md`** — architecture, runtime, co-op, invariants (default deep read)
3. **`web/README.md`** — module map (when locating code)
4. **`docs/DEPLOY.md`** — release/ops (when deploying)
5. **`docs/SCOPE.md`** — product UX (German; human spec; on demand only)

Do not load `docs/release-notes/` for implementation tasks.

## Quick map

| Intent | Start here | Skill |
| ------ | ---------- | ----- |
| Repo doc structure / verify | `docs/README.md` | `docs-shared` |
| PR or branch alignment | MOC → changed leaves | `docs-sync` |
| Commit + changelog hygiene | staged diff vs architecture | `docs-commit` |
| Consolidation / dead paths | MOC audit | `docs-defrag` |
| Regenerate architecture / ADR | `docs/AGENTS_ARCHITECTURE.md` | `docs-writer` |

Load **one row** per task; avoid reading all skills.
