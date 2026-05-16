# Reusable Skills

These skills can be used in this project or copied to other projects.

## Using in This Project

Scripts are at `.cursor/skills/{skill-name}/scripts/`. Run from project root.

## Using in Other Projects

### Option 1: Copy to Project

Copy the skill folder(s) into your project's `.cursor/skills/`:

```bash
# From this repo
cp -r .cursor/skills/release         /path/to/other-project/.cursor/skills/
cp -r .cursor/skills/docs-commit-check /path/to/other-project/.cursor/skills/
cp -r .cursor/skills/docs-bootstrap /path/to/other-project/.cursor/skills/
cp -r .cursor/skills/docs-writer /path/to/other-project/.cursor/skills/
```

### Option 2: Personal Skills (All Projects)

Copy to `~/.cursor/skills/` to use across all projects:

```bash
cp -r .cursor/skills/release         ~/.cursor/skills/
# etc.
```

When using personal skills, replace `.cursor/skills/` with `~/.cursor/skills/` in script paths.

## Prerequisites by Skill

| Skill | Requirements |
|-------|--------------|
| **release** | Node.js, pnpm, Git, GitHub Actions (test tags / v* tags) |
| **docs-commit-check** | Changelog draft file (default: `change_notes.md`) + keep `AGENTS.md`/`ARCHITECTURE.md`/`docs/AGENTS_*.md` accurate |
| **docs-bootstrap** | `AGENTS.md`, `ARCHITECTURE.md`, and `docs/AGENTS_*.md` present |
| **docs-writer** | Use when generating/updating AI-optimized docs |

## Project Conventions

Scripts expect these conventions (adapt if your project differs):

- **Version:** `package.json` → `version` field
- **Changelog draft:** `change_notes.md` in project root
- **Release notes:** `docs/release-notes/RELEASE_NOTES_v{version}.md`
- **Build number:** `.build-number` (JSON: version, buildNumber)
- **Tags:** Test `test-*`, Production `v*.*.*`

## Script Paths

| Skill | Script | Command |
|-------|--------|---------|
| release (test) | release-test.sh | `bash .cursor/skills/release/scripts/release-test.sh` |
| release (prod) | release-prod.sh | `bash .cursor/skills/release/scripts/release-prod.sh patch\|minor\|major` |
| docs-commit-check | change-notes-template.sh | `bash .cursor/skills/docs-commit-check/scripts/change-notes-template.sh` |
| docs-bootstrap | verify-docs.sh | `bash .cursor/skills/docs-bootstrap/scripts/verify-docs.sh` |
