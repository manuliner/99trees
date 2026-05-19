# Change Notes

<!-- Collect changes here during development -->
<!-- This file will be converted to RELEASE_NOTES_v*.md during production release -->

## 🎉 What's New

- **Co-op Model B (async depot):** initiator opens a depot after station instructions; partner joins on the same field; team-QR linking grants configurable bonus points (`docs/COOP_V2.md`, migration `0011_coop_depots`).
- **Media tasks:** photo/video upload with client-side transcode (`@ffmpeg/ffmpeg`), server storage, and crew approval flow (`turn_submissions`, migration `0012`).
- **Team onboarding:** avatar picker, optional motto, team directory search; gates play until complete (`0013_team_onboarding`).
- **Edition pixel palettes** and per-edition join hero (bilingual description + logo upload).
- **Board overflow:** stations passed without solving shown in hellblau; zero-round abandon restores prior overflow snapshot (`0010`).
- **Player legal pages:** shared impressum/privacy content; edition-scoped routes.
- **Admin:** add/remove board fields, delete tasks, join-logo upload, localized task textareas.

## 🐛 Bug Fixes

<!-- Add bug fixes here -->

## 🔧 Improvements

- Leaderboard and play UI show team avatars; edition-themed CSS via `pixel-palettes`.
- CSRF origin check on mutating API routes; stricter production security headers and upload size route rule.
- Crew session uses signed per-edition token (migration `0014`); rate limiting uses shared client IP helper.
- Demo seed data consolidated into `demo-tasks.json` (removed bundled `demo-stations.json`).
- App version footer links to impressum; dev roll endpoint for faster testing.

## 📚 Documentation

- `AGENTS.md`: coop/media/onboarding pointers, overflow and crew-session gotchas, `COOP_V2` doc index.
- Product spec updates in `docs/SCOPE.md`; coop operator notes in `docs/COOP_V2.md`.
- Regenerated `web/**/README.md` module docs and `web/README.md` index (`docs-update`) for coop, media, onboarding, and new API routes.
- Refreshed `.vibe/docs` architecture, requirements, design, play-flow, and dependency graph (`docs-concepts`).

## ⚠️ Breaking Changes

- Existing crew browser sessions require re-login after deploy (crew session token migration).
- `demo-stations.json` removed from repo; use `demo-tasks.json` or keep a local legacy file for seed fallback only.

---
*This file is automatically converted to release notes during production release.*
