@AGENTS.md

## Reading this codebase

Start with **AGENTS.md**. Module map: **web/README.md**. Architecture: **docs/AGENTS_ARCHITECTURE.md**. Stale docs → `/docs-write`, `/docs-defrag`, `/docs-verify`, or `/docs-commit`.

## Workspace

This repo is an L1 service in a multi-repo workspace. For cross-service context, read the L0 harness first:

- Service catalog: `../platform-harness/WORKSPACE.md`
- Cross-service architecture: `../platform-harness/docs/AGENTS_ARCHITECTURE.md`

## Doc Skills

| Skill | When to use |
|-------|-------------|
| `/docs-write` | Author new leaves, ADRs, runbooks — regenerate `docs/AGENTS_ARCHITECTURE.md` |
| `/docs-verify` | Structural and MOC gate before commit or merge (`--scope=staged\|branch`) |
| `/docs-defrag` | Consolidate, prune, and fix doc drift |
| `/docs-commit` | Commit staged code via agent + catch doc-to-code drift |
