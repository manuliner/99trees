@AGENTS.md

## Reading this codebase

Start with **AGENTS.md**. Module map: **web/README.md**. Architecture: **docs/AGENTS_ARCHITECTURE.md**. Stale docs → `/docs-writer`, `/docs-defrag`, or `/docs-commit`.

## Workspace

This repo is an L1 service in a multi-repo workspace. For cross-service context, read the L0 harness first:

- Service catalog: `../platform-harness/WORKSPACE.md`
- Cross-service architecture: `../platform-harness/docs/AGENTS_ARCHITECTURE.md`

## Doc Skills

| Skill | When to use |
|-------|-------------|
| `/docs-writer` | Regenerate `docs/AGENTS_ARCHITECTURE.md` or create an ADR |
| `/docs-sync` | Keep docs aligned with branches and PRs |
| `/docs-commit` | Pre-commit gate — check which docs need updating before committing |
| `/docs-defrag` | Audit docs for drift, dead paths, and principle violations |
