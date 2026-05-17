# Docs skills — shared reference

Seven project skills + one global init share these principles. This folder is **reference only** (not invokable).

| Skill | Location | Role |
|-------|----------|------|
| **docs-init** | Global `~/.cursor/skills/docs-init` | Bootstrap + legacy migration + vibe generation |
| **docs-sync** | `.cursor/skills/docs-sync` | Factual patches when code changed |
| **docs-update** | `.cursor/skills/docs-update` | Regen `web/**/README.md` + traces |
| **docs-concepts** | `.cursor/skills/docs-concepts` | Regen `.vibe/docs/` from READMEs |
| **docs-defrag** | `.cursor/skills/docs-defrag` | Principles audit + verify scripts |
| **docs-commit** | `.cursor/skills/docs-commit` | Commits + changelog + doc gate |

Install global init: `bash .cursor/skills/_vendor/docs-init/install.sh`

## Reference files

| File | Use |
|------|-----|
| [`reference/agent-context-files.md`](reference/agent-context-files.md) | `AGENTS.md`, `CLAUDE.md`, rules |
| [`reference/doc-type-selector.md`](reference/doc-type-selector.md) | Which file to edit |
| [`reference/architecture-md.md`](reference/architecture-md.md) | `.vibe/docs/architecture.md` shape |
| [`reference/adr-template.md`](reference/adr-template.md) | ADRs under `docs/adr/` |
| [`reference/precommit-integration.md`](reference/precommit-integration.md) | Optional hooks |

## Principles

- **Token-dense** — `AGENTS.md` loads every chat; no API trees there.
- **Surgical edits** — patch drifted sections only.
- **No stale paths** — remove deleted files/routes from all layers.
- **Layers** — `AGENTS.md` (commands, invariants) → `web/README.md` + module READMEs → `.vibe/docs/` (architecture, flows).
- **One source of truth** — same fact in one place only.
- **Human product docs** — `docs/SCOPE.md` (German) is not an agent codemap.

## Interference guards

| Tool | Use for agent context? |
|------|------------------------|
| **docs-init / docs-sync / docs-update** | Yes |
| **create-rule** | Cursor rules only — not full codemaps |
| **migrate-to-skills** | Do not migrate `docs-*.md` commands into duplicate skills |
| **docs-canvas** | Presentation / walkthrough UI only — not repo SSOT |

## Verify

```bash
bash .cursor/skills/docs-shared/scripts/verify-docs.sh
```
