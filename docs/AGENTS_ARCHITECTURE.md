---
audience: agent
category: architecture
type: Codemap
last_verified: 2026-06-19
load-when: Understand system shape, runtime flow, invariants, or where a feature lives cross-layer.
sources:
  - web/
  - docs/AGENTS_ARCHITECTURE.md
sources_stamp: 3aa4e0cbae9a5593e2b408493471be3a56c9b404
---
# Architecture

## System goals

Zugvögel (99trees) is a festival field-game PWA: teams roll dice, move on a board, scan station QR codes, solve tasks, and compete on a points-based leaderboard. A single Nuxt 4 app serves player, crew, and admin audiences. The server owns all game state; clients reflect it via polling `GET /api/me`.

## Scope

**In scope:** Edition lifecycle (draft/live/paused/ended), team registration and rejoin, turn loop (roll → scan → task → confirm), quiz/performance/coop/media activity types, crew approval queue, co-op depot linking (Model B), admin backoffice (tasks, map, QR export, teams), bilingual player UI (DE/EN), SQLite persistence, Docker deploy.

**Out of scope:** Real-time push/sync, multi-tenant SaaS, payment/ticketing integration (deployed via sibling infra), native mobile apps.

**External interfaces:** Browser PWA (camera for QR, ffmpeg.wasm for media transcode), printable QR deep links (`/s/:slug`, `/t/:slug`), REST under `/api/*`, static uploads under `/api/uploads/editions/*`.

## Module layout

| Path | Purpose |
|------|---------|
| `web/app/` | Vue pages, pixel UI components, composables, i18n layouts |
| `web/app/pages/[edition]/` | Canonical player routes (`join`, `play`, `leaderboard`, …) |
| `web/app/pages/admin/` | Organizer login, edition backoffice |
| `web/app/pages/crew/` | Crew PIN login and approval queue |
| `web/server/api/` | Thin Nitro REST handlers — auth, validation, delegate to services |
| `web/server/services/` | Domain orchestration: `game.ts`, `coop.ts`, `crew.ts`, `media-submission.ts`, `team-onboarding.ts` |
| `web/server/database/` | Drizzle schema + versioned SQLite migrations |
| `web/server/plugins/` | Boot: migrations (`00`), performance timeout (`01`), env validation (`02`) |
| `web/server/middleware/` | CSRF origin check (prod), in-memory rate limits |
| `web/server/utils/` | DB access, edition config, separate session cookies (team/crew/admin/staff) |
| `web/shared/` | Pure TS: types, Zod schemas, scoring, board layout, activity payloads — importable both sides |
| `web/i18n/locales/` | Player UI strings (DE default, EN) |
| `web/data/` | Demo seed JSON for local dev |
| `docs/` | This doc, deploy runbook, product spec (`SCOPE.md`, German) |

## Runtime view

**Startup:** Nitro boot → SQLite migrations via Drizzle (`00-database-migration`) → task i18n backfill → env validation banner (`02-env-validation`; prod fails on default secrets) → performance auto-complete interval starts (`01-performance-timeout`).

**Team session:** Register or rejoin → httpOnly `team_session` cookie + hashed token on team row → onboarding (avatar, motto) → play.

**Turn loop:**
1. `POST /api/turns/roll` — dice + path; skip completed fields (`resolvePendingPosition`); track overflow (passed-but-unsolved fields).
2. Scan station QR → validate slug/token/field → activity branch: quiz (hints, answers), performance/media (crew queue), coop (depot + partner link).
3. Task completes → `POST …/confirm` — score via `calculateTurnScoreBreakdown`, update `position_confirmed`, `score_total`, `completed_fields_json`.
4. Alternative exits: zero-round abandon (score 0, position unchanged), continue-playing during crew/coop wait (advance position, background wait).

**Crew:** Edition-scoped PIN login → approval queue for performance/media → rating sets `bonusPoints` → team confirms.

**Admin:** One-shot `/api/admin/init`, then session; CRUD editions/tasks, board field add/remove, map upload, QR HTML export, team PIN overrides.

**Leaderboard:** Ranks by `score_total` for teams with goal reached (`reached_goal_at` / `position_confirmed >= field_count`).

## Co-op (Model B)

Async depot: initiator completes station instructions → depot row (`awaiting_partner`); partner rolls to same field → completes partner instructions → optional `continue-playing` → both teams claim bonus via team QR link.

| Step | API |
|------|-----|
| Scan (co-op branch) | `POST /api/turns/:id/scan` |
| Finish initiator/partner part | `POST /api/turns/:id/coop/complete` |
| Defer partner wait | `POST /api/turns/:id/coop/continue-playing` |
| Team QR bonus | `POST /api/coop/link` (`partnerSlug`, `token`) |
| State poll | `GET /api/me` → `pendingCoopItems`, `openTurn.coopRole` |

Task payload: `{ "type": "coop", "instructions": {de,en}, "partnerInstructions": {de,en} }`. DB: `coop_depots` (migration `0011`), unique open depot per `(edition_id, field_number)`. Turn states: `awaiting_coop`, `awaiting_coop_bg`. Bonus: `coopBonusPoints` in edition config (default 25). Code: `web/server/services/coop.ts`.

## Crosscutting concerns

- **Config:** `web/nuxt.config.ts` runtimeConfig — `NUXT_SQLITE_DATABASE_PATH`, `NUXT_SESSION_PASSWORD`, `NUXT_ADMIN_INIT_SECRET`, `NUXT_CREW_SESSION_PASSWORD`; per-edition rules in `config_json` (hint costs, timeouts, coop bonus).
- **Secrets:** Server-only env; prod startup rejects dev defaults; never expose in `web/app/`.
- **Sessions:** Four cookie namespaces — team, crew (per-edition token hash), admin (`nuxt-auth-utils`), staff; rejoin invalidates prior team token (single active device).
- **Security:** Prod CSP + HSTS headers; CSRF origin check on mutating API with session cookies; IP rate limits on auth/roll/turn paths.
- **i18n:** Player UI via `@nuxtjs/i18n`; task content bilingual in DB/import JSON; admin/crew English hardcoded.
- **Media:** Client transcode (`@ffmpeg/ffmpeg`) → server stores under `web/server/database/uploads/submissions/` (gitignored).
- **Logging:** Structured game events via `logger.ts`; startup banner on boot.
- **DB:** SQLite file + Drizzle ORM; migrations on every Nitro start; `pnpm db:generate` / `db:migrate` / `db:seed` for dev.
- **Deploy:** Docker + GitHub Actions → NixOS host; see [`DEPLOY.md`](./DEPLOY.md).

## Key decisions

1. **Monolithic Nuxt 4** — one deploy unit for PWA + API; shared types via `#shared` alias (no server imports in app).
2. **Server-authoritative state** — turns, positions, points live in SQLite; UI polls `/api/me`, no client-side game logic beyond presentation.
3. **Scoring in `shared/scoring.ts`** — single formula (base 100, time bonus, crew bonus, hint/quiz penalties); handlers call `calculateTurnScoreBreakdown`.
4. **Activity type enum** — `quiz | performance | coop | media` drives post-scan flow; performance auto-completes after `performanceTimeoutMinutes`.
5. **Board overflow model** — passed fields without solve tracked in `overflow_fields_json` (hellblau tiles); restored on zero-round abandon.
6. **Co-op Model B** — async partner depot linking outside active turn scan (see § Co-op above).
7. **Edition-scoped URLs** — canonical player paths under `/:edition/*`; legacy root routes redirect.
8. **SQLite on boot migrate** — simplifies Docker/single-node deploy; no separate migration runner in prod.

## Invariants

- `web/app/` MUST NOT import `web/server/`.
- N fields = N stations per edition; **"99" is branding**, not `field_count`.
- Leaderboard uses confirmed position / goal reached — not pending mid-turn state.
- Completed fields skipped on subsequent dice rolls.
- Zero-round abandon: `score_delta = 0`, `position_confirmed` unchanged, team overflow restored from pre-roll snapshot.
- One open turn per team; scan only in `rolled` state on matching field.
- Prod requires unique session secrets ≥32 chars.

## On-demand docs

| Doc | When to read |
|-----|--------------|
| [AGENTS_SERVER.md](./AGENTS_SERVER.md) | Server/API/DB path lookup |
| [AGENTS_APP.md](./AGENTS_APP.md) | UI/composable path lookup |
| [SCOPE.md](./SCOPE.md) | Product UX rules, copy, acceptance criteria (German, human-facing) |
| [DEPLOY.md](./DEPLOY.md) | Release, rollback, env, backups |
