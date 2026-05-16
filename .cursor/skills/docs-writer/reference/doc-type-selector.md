# Doc type selector

Pick the smallest doc that keeps future changes fast and safe.

## Decision logic

- If you changed repository-wide conventions, commands, structure, invariants → update `AGENTS.md` (and possibly `.cursor/rules/*.mdc`).
- If you changed boundaries, major modules, or cross-cutting behavior → update `ARCHITECTURE.md`.
- If you changed “where to change X” (codemap navigation) → update the relevant `docs/AGENTS_*.md`.
- If you made a durable architectural decision → write an ADR under `docs/adr/`.
- If you changed a single function or module contract → add/update inline docs (JSDoc / docstrings) only.

## Anti-patterns

- Don’t write long prose “docs” when a codemap or invariant list suffices.
- Don’t duplicate information across many files; keep a single source of truth.

