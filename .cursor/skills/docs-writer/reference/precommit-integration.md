# Pre-commit integration (optional)

This repo uses “docs as infrastructure”. When staging changes, do a quick check:

1. Do staged changes make `AGENTS.md` / `ARCHITECTURE.md` / `docs/AGENTS_*.md` incorrect?
2. If yes, update the relevant doc(s) **in the same commit**.

If you want a hook-driven workflow later, integrate `docs-commit-check` and run a verify script before allowing commits.

