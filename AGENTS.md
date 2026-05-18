# AGENTS.md — 99trees (Zugvögel)

Festival field-game PWA: dice, stations, QR scans, points-based highscore. Single Nuxt 4 app (`web/app` + `web/server` + `web/shared`).

## Commands (repo root)

| Action | Command |
|--------|---------|
| Dev | `pnpm dev` — Nuxt on `0.0.0.0` (default port 3000) |
| Build | `pnpm build` |
| Preview prod build | `pnpm preview` |
| Typecheck | `pnpm typecheck` |
| DB migrate chain | `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:seed` |
| DB wipe + re-migrate | `pnpm db:reset` |

First-time dev: run DB migrate + seed before join/play flows.

## Env (server-only, `web/nuxt.config.ts` runtimeConfig)

| Var | Purpose |
|-----|---------|
| `NUXT_SQLITE_DATABASE_PATH` | SQLite file (default `./server/database/db.sqlite` under `web/`) |
| `NUXT_SESSION_PASSWORD` | nuxt-auth-utils session encryption (≥32 chars prod) |
| `NUXT_ADMIN_INIT_SECRET` | One-shot `/api/admin/init` bootstrap |
| `NUXT_CREW_SESSION_PASSWORD` | Crew cookie signing |

Never commit `.env` or expose secrets in `web/app/`.

## Structure

```
web/
  app/           # Nuxt pages, pixel UI, composables
  locales/       # Player UI strings (de default, en) — @nuxtjs/i18n
  server/api/    # Nitro REST — thin handlers
  server/services/  # game.ts, crew.ts — domain orchestration
  server/database/  # Drizzle schema + migrations
  server/utils/    # db, *-session cookies, edition-config
  shared/        # types, Zod schemas, scoring (pure — importable both sides)
  data/          # demo-tasks.json (seed/import sample; legacy demo-stations.json fallback)
  scripts/       # seed.mjs, db-reset.mjs
docs/            # SCOPE (product spec), DEPLOY, release notes
.vibe/docs/      # architecture, requirements, design, flows
```

## Conventions

- **Imports:** `web/app/` uses `#shared/*` alias — never import `web/server/`.
- **API client:** `useGameApi()` → `$fetch` with `credentials: 'include'`.
- **State:** Server owns turns/positions/points; UI polls/refreshes `GET /api/me`.
- **Scoring:** Change `web/shared/scoring.ts` only — handlers call `calculateTurnScore`.
- **UI language:** Player flows (join, rejoin, play, rules, privacy) — **DE default / EN** via `@nuxtjs/i18n` (`web/locales/`, `layouts/player.vue` switcher). Admin and crew stay English. **Task content** (quiz, hints, performance text) is **bilingual edition data** (`de`/`en` per field in import/DB); player UI resolves by active locale. Product spec in `docs/SCOPE.md` is German.
- **Styling:** Pixel tokens in `app/assets/css/pixel-theme.css`; components in `app/components/pixel/`.

## Invariants

- `web/app/` MUST NOT import `web/server/`.
- N fields = N stations per edition; **"99" is branding**, not `field_count`.
- Leaderboard uses `position_confirmed` only (not pending mid-turn).
- Completed fields are skipped on subsequent dice rolls (`resolvePendingPosition` in `game.ts`).
- Zero-round abandon: `score_delta = 0`, `position_confirmed` unchanged.
- Sessions: team / crew / admin use separate httpOnly cookies (`server/utils/*-session.ts`).

## Where to change what

| Task | Start here |
|------|------------|
| Turn rules, roll/scan/confirm | `web/server/services/game.ts` + `web/server/api/turns/` |
| Points formula | `web/shared/scoring.ts` |
| Team play UI | `web/app/pages/play.vue` |
| Crew rating / PIN reset | `web/app/pages/crew/`, `web/server/services/crew.ts` |
| Admin edition live | `web/app/pages/admin/`, `web/server/api/admin/` |
| DB columns | `web/server/database/schema.ts` → `pnpm db:generate` |

## Gotchas

- Migrations run on Nitro boot (`server/plugins/00-database-migration.ts`) — restart dev after schema changes.
- Performance tasks auto-complete after `performanceTimeoutMinutes` (`server/plugins/01-performance-timeout.ts`).
- `pnpm db:seed` reads `web/data/demo-tasks.json` (falls back to `demo-stations.json`); import API for admin is YAML-shaped JSON.
- iOS QR: prefer `@zxing/browser` fallback when `BarcodeDetector` missing (`TaskQrScanner.vue`).
- Rejoin invalidates prior team session token (single active device per team).

## Doc index

| Question | Read first |
|----------|------------|
| Commands, env, invariants | This file (`AGENTS.md`) |
| Module map (where is X?) | [`web/README.md`](web/README.md) → per-folder README |
| Architecture, flows, design | [`.vibe/docs/`](.vibe/docs/) (`architecture.md`, `play-flow.md`, …) |
| Product rules, UX (German) | [`docs/SCOPE.md`](docs/SCOPE.md) |
| Deploy, backups | [`docs/DEPLOY.md`](docs/DEPLOY.md), operator runbook [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Implementation checklist | [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) |

**Maintain docs:** `docs-sync` (factual patches), `docs-update` (module README regen), `docs-concepts` (vibe regen), `docs-defrag` (audit). Verify: `bash .cursor/skills/docs-shared/scripts/verify-docs.sh`
