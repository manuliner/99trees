# Change Notes

<!-- Collect changes here during development -->
<!-- This file will be converted to RELEASE_NOTES_v*.md during production release -->

## 🎉 What's New

- Admin: create edition, upload festival map, export station QR HTML, pause/end game, entry QR preview
- Admin: PIN reset for teams (`POST /api/admin/teams/:id/reset-pin`)
- Hint level 3 shows festival map pin (`FestivalMap.vue`); hints deduct points immediately on use
- Crew: scan Team QR to open rating; logout; deep-link login with `teamSlug` / `teamT`
- Leaderboard: draft/paused states, winner banner, mini board, highlight own team, O10 fallback ranking
- PWA: service worker shell cache and install-to-homescreen hint
- Build: Docker injects `version.json`; app version footer and health endpoint report version
- Demo: expanded `demo-stations.json` (50 fields) and seed improvements

## 🐛 Bug Fixes

- Fixed second dice roll blocked after confirming a turn (`getOpenTurn` excludes `confirmedAt`)
- Fixed 0-round “Roll again” during performance wait (`abandon` allows `awaiting_crew`)
- Leaderboard official ranking when no team reaches goal (fallback by field, then score)

## 🔧 Improvements

- Edition must be `live` for hint/scan/confirm/abandon; checklist blocks going live with gaps
- Rate limiting on rejoin, roll, turn actions, and leaderboard (in-memory middleware)
- Structured JSON logging for roll, scan, and crew rating events
- Map images stored beside SQLite and served via `/api/uploads/editions/…`
- `StationQrScanner` supports `mode="team"` for crew flows
- Scoring: `hintsAlreadyDeducted` avoids double-charging hints at confirm (migration `0002`)

## 📚 Documentation

- Agent docs: hybrid layout (`AGENTS.md`, `web/README.md`, `.vibe/docs/`), unified doc skills
- `docs/SCOPE.md`: repo status no longer “greenfield”
- `.cursor/rules/main.mdc` points to project context files
- Cursor doc skills: `docs-sync`, `docs-commit`, `docs-update`, `docs-concepts`, `docs-defrag`, vendor `docs-init`; `release` skill

## ⚠️ Breaking Changes

- DB migration `0002_hint_points_deducted` — run `pnpm db:migrate` before deploy
- DB migrations `0003` / `0004`: edition `slug` column and unique `(edition_id, station slug)` — run `pnpm db:migrate` before deploy

---
*This file is automatically converted to release notes during production release.*
