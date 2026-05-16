# ARCHITECTURE.md Generation

ARCHITECTURE.md is a high-signal **codemap**: it helps an agent quickly find the right file(s) to change.
It is NOT a full spec or tutorial.

## Required sections

### 1) Overview (2–4 sentences)

What problem does the repo solve? Who uses it?

### 2) Codemap

Describe the major modules and how they relate. Name specific directories and key files.

### 3) Key files and types

List the most important files/types by name (agents will search for them).

### 4) Invariants

State what must remain true (dependency direction, boundaries, security constraints).

### 5) Cross-cutting concerns (optional)

Logging, error handling, config/env validation, auth boundaries, etc., when non-obvious.

## Guidelines

- Target: ~150–250 lines (shorter is often better)
- Prefer small Mermaid diagrams over long prose when it clarifies boundaries
- Avoid tables (they go stale)
- Keep it fact-based; remove anything not verifiable from code

