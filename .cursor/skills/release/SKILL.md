---
name: release
description: >
  Releases: test deploy (tags), production semver bumps, and release notes conversion.
  Use when the user asks to bump version, test or production release, deploy to test,
  or create release tags.
---

# Release

## Reuse

- **Project**: `.cursor/skills/release/scripts/` (run from **repo root**)
- **Personal skill copy**: replace `.cursor/skills/` with `~/.cursor/skills/` in paths below

## Test release (no semver bump in `web/package.json`)

```bash
bash .cursor/skills/release/scripts/release-test.sh
bash .cursor/skills/release/scripts/release-test.sh my-custom-tag   # optional custom tag
```

- Runs a minimal quality gate (typecheck, plus tests if `pnpm test` exists) before tags
- Increments build number in `.build-number`
- Creates `test-{version}-{build}` tag (or custom) → push when ready
- **99trees:** no `.github/workflows` yet — tags do not auto-deploy until CI is configured for your host/registry
- Dirty git allowed; any branch

## Production release (bumps `web/package.json`)

```bash
bash .cursor/skills/release/scripts/release-prod.sh patch
bash .cursor/skills/release/scripts/release-prod.sh minor
bash .cursor/skills/release/scripts/release-prod.sh major
```

- Runs a minimal quality gate before changing release notes, versions, commits or tags
- Bumps version in `web/package.json`
- Converts `change_notes.md` → `docs/release-notes/RELEASE_NOTES_v*.md`
- Resets `change_notes.md` template; commits; tags `v*.*.*`; pushes

**Requirements:** `master`/`main`, clean git, `change_notes.md` with real content (not template-only).

## Do not

- Manually bump `web/package.json` for production releases (use `release-prod.sh`)
- Force-push tags

## Database / rollbacks

Ship additive DB migrations only (nullable new columns, no destructive renames in the same release as code that depends on them); otherwise rolling back the Docker image can leave SQLite on a schema the old binary cannot read.
