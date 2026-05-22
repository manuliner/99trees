---
name: release
description: >
  Production releases: semver bumps, release notes, and deploy to trees.loco.vision.
  Use when the user asks to bump version, production release, or create release tags.
  This repo has no test deploy — use release-prod.sh only.
---

# Release

**Production only** — `https://trees.loco.vision`. No test instance on `pretix-server-01`.
Deploy runbook: [`docs/DEPLOY.md`](../../../docs/DEPLOY.md).

## Reuse

- **Project**: `.cursor/skills/release/scripts/` (run from **repo root**)
- **Personal skill copy**: replace `.cursor/skills/` with `~/.cursor/skills/` in paths below

## Production release (bumps `web/package.json`)

```bash
bash .cursor/skills/release/scripts/release-prod.sh patch
bash .cursor/skills/release/scripts/release-prod.sh minor
bash .cursor/skills/release/scripts/release-prod.sh major
```

- Runs a minimal quality gate before changing release notes, versions, commits or tags
- Pins `manulinger/99trees:<semver>` in ticketing (`../ticketing/environments/99trees-prod.nix`)
- Bumps version in `web/package.json`
- Converts `change_notes.md` → `docs/release-notes/RELEASE_NOTES_v*.md`
- Resets `change_notes.md` template; commits; tags `v*.*.*`; pushes
- Push triggers `build.yml` → `deploy.yml` (SSH backup, pull, restart prod unit, health check)

**Requirements:** `master`/`main`, clean git, `change_notes.md` with real content (not template-only).

## Test tags (not used here)

`release-test.sh` and `test-*` image builds exist in `build.yml`, but **`deploy.yml` rejects test tags** — there is no test deploy for 99trees. Do not use test releases unless a test host is added later.

## Do not

- Manually bump `web/package.json` for production releases (use `release-prod.sh`)
- Force-push tags
- Run `release-test.sh` expecting a deploy (images may push; nothing deploys)

## Database / rollbacks

Ship additive DB migrations only (nullable new columns, no destructive renames in the same release as code that depends on them); otherwise rolling back the Docker image can leave SQLite on a schema the old binary cannot read.

Image rollback: GitHub Actions → *Rollback Docker image* → production + immutable tag. See [`docs/DEPLOY.md`](../../../docs/DEPLOY.md).
