# Release Notes - v0.0.0


## 🎉 What's New

- Admin: create edition, upload festival map, export station QR HTML, pause/end game, entry QR preview
- Admin: PIN reset for teams (`POST /api/admin/teams/:id/reset-pin`)
- Hint level 3 shows festival map pin (`FestivalMap.vue`); hints deduct points immediately on use
- Crew: scan Team QR to open rating; logout; deep-link login with `teamSlug` / `teamT`
- Leaderboard: draft/paused states, winner banner, mini board, highlight own team, O10 fallback ranking
- PWA: service worker shell cache and install-to-homescreen hint
- Build: Docker injects `version.json`; app version footer and health endpoint report version
- Demo: expanded `demo-stations.json` (50 fields) and seed improvements
- Edition-scoped URLs (`/{slug}/join`, crew, play) with legacy redirects; slug APIs and env validation on boot
- Admin: station CRUD, team PIN patch, logout; map uploads via `/api/uploads/editions/…`
- Dev: simulate scan and auto-complete performance endpoints under `/api/dev/turns/…`
- Play: `GameBoard` and `HintBar` turn hints; pixel confirm dialogs and pull-to-refresh
- Admin UI split into accordion sections; crew staff approval list; edition layouts and `[edition]/*` pages
- Play: expandable festival map with fullscreen pan/zoom; pixel-square `GameBoard` tiles and orthogonal track path
- Play: hint tips dialog (close, Escape); auto-open tips after claiming a hint

## 🐛 Bug Fixes

- Fixed second dice roll blocked after confirming a turn (`getOpenTurn` excludes `confirmedAt`)
- Fixed 0-round “Roll again” during performance wait (`abandon` allows `awaiting_crew`)
- Leaderboard official ranking when no team reaches goal (fallback by field, then score)

## 🔧 Improvements

- Edition must be `live` for hint/scan/confirm/abandon; checklist blocks going live with gaps
- Rate limiting on rejoin, roll, turn actions, and leaderboard (in-memory middleware)
- Structured JSON logging for roll, scan, and crew rating events
- Map images stored beside SQLite and served via `/api/uploads/editions/…`
- `.env.example` documents `web/.env` paths; release uses `.build-number`
- `StationQrScanner` supports `mode="team"` for crew flows
- Scoring: `hintsAlreadyDeducted` avoids double-charging hints at confirm (migration `0002`)

## 📚 Documentation

- Agent docs: hybrid layout (`AGENTS.md`, `web/README.md`, `.vibe/docs/`), unified doc skills
- `docs/SCOPE.md`: repo status no longer “greenfield”
- `.cursor/rules/main.mdc` points to project context files
- Cursor doc skills: `docs-sync`, `docs-commit`, `docs-update`, `docs-concepts`, `docs-defrag`, vendor `docs-init`; `release` skill
- Agent docs: hybrid layout (`AGENTS.md`, `web/README.md`, `.vibe/docs/`); removed `ARCHITECTURE.md` and `docs/AGENTS_*`
- `docs/SCOPE.md`: edition URLs use `/{slug}/join` and `/{slug}/crew/login`
- Vendor `docs-init` templates renamed to `skill.template.md` to avoid duplicate Cursor skill registration
- `docs/SCOPE.md` and implementation status reference `GameBoard.vue` (not BirdBoard)
- Module READMEs for `web/app/components/admin/` and `web/app/layouts/`
- Regenerated module READMEs/traces for festival map, `GameBoard` layout, and expanded `web/README.md` index
- `.vibe/docs/`: play flow, architecture, and requirements aligned with festival map and board UX

## ⚠️ Breaking Changes

- DB migration `0002_hint_points_deducted` — run `pnpm db:migrate` before deploy
- DB migrations `0003` / `0004`: edition `slug` column and unique `(edition_id, station slug)` — run `pnpm db:migrate` before deploy

---

**Release Date**: 2026-05-18
**Version**: 0.0.0
