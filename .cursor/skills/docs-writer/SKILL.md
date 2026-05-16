---
name: docs-writer
description: >
  Generates AI-optimized documentation for codebases — token-efficient, structured,
  and designed to maximize signal for AI coding assistants (Cursor, etc.).
  Use when the user wants to document code, generate AGENTS.md, ARCHITECTURE.md,
  CLAUDE.md, module headers, or ADRs; "document my codebase",
  "make this AI-readable", or improve agent context. Chooses the right doc type
  for the context automatically.
---

# Docs writer

Generates AI-optimized documentation that reduces token usage and maximizes signal
for AI coding assistants. Selects the appropriate documentation type based on context.

## Core principle

Documentation is infrastructure. Every token in a project-level file is loaded on
every AI interaction. Write dense, intent-rich docs — not verbose prose.

---

## Step 1: Analyze context and select documentation type

Before writing anything, assess what documentation is needed.

Read `reference/doc-type-selector.md` for the full decision logic.

**Quick selection guide:**

| Trigger | Doc Type |
|---|---|
| New/changed function, method, class | Inline docstring / JSDoc |
| New file or module created | Module header |
| New repo or major refactor | AGENTS.md + ARCHITECTURE.md |
| Significant architectural decision | ADR |
| Pre-commit on mixed changes | Run selector per changed file/scope |
| "Make AI-readable" with no specifics | Full audit → all applicable types |

---

## Step 2: Gather context

For each documentation target, collect:

1. **Code to document** — read the file(s). If > 300 lines, read key sections only.
2. **Existing docs** — check existing doc files (AGENTS.md / ARCHITECTURE.md / docs/AGENTS_*.md), and `package.json`.
3. **Dependencies and imports** — understand what the module uses and exports.
4. **Git history hint** (optional) — recent commit messages reveal intent.

Do NOT ask the user for information that can be inferred from reading the code.

---

## Step 3: Generate documentation

Read the relevant reference file for the doc type selected:

- **AGENTS.md / CLAUDE.md / .cursor rules:** `reference/agent-context-files.md`
- **ARCHITECTURE.md:** `reference/architecture-md.md`
- **ADR:** `reference/adr-template.md`
- **Pre-commit integration:** `reference/precommit-integration.md`

---

## Step 4: Output format

### For inline docs
Output as **diff-style or direct file edit** — show exactly what to add/replace.
Never rewrite the whole file; show only the documentation additions.

### For project-level files (AGENTS.md, ARCHITECTURE.md, ADR)
Output as **complete Markdown files** ready to copy into the repo root.

### For pre-commit mode
Output a **summary report** listing each file changed and what documentation
was added/updated, followed by the actual doc additions grouped by file.

---

## Quality checklist (apply before finalizing)

- [ ] **No restating the obvious** — explain WHY, not WHAT the code does literally
- [ ] **Intent + constraints documented** — edge cases, invariants, non-obvious decisions
- [ ] **Token-dense** — no filler phrases ("This function is responsible for...")
- [ ] **Structured format used** — tags, headings, consistent sections
- [ ] **Examples included** where the contract is non-trivial
- [ ] **AI-navigation aids** — put “where to change X” guidance early in codemaps
- [ ] **No stale content** — do not document behavior not present in code

