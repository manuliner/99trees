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
  app/           # Nuxt pages, pixel UI, composables (English copy)
  server/api/    # Nitro REST — thin handlers
  server/services/  # game.ts, crew.ts — domain orchestration
  server/database/  # Drizzle schema + migrations
  server/utils/    # db, *-session cookies, edition-config
  shared/        # types, Zod schemas, scoring (pure — importable both sides)
  data/          # demo-stations.json (seed/import sample)
  scripts/       # seed.mjs, db-reset.mjs
docs/            # SCOPE (product spec), AGENTS_* codemaps
```

## Conventions

- **Imports:** `web/app/` uses `#shared/*` alias — never import `web/server/`.
- **API client:** `useGameApi()` → `$fetch` with `credentials: 'include'`.
- **State:** Server owns turns/positions/points; UI polls/refreshes `GET /api/me`.
- **Scoring:** Change `web/shared/scoring.ts` only — handlers call `calculateTurnScore`.
- **UI language:** English only (MVP); product spec in `docs/SCOPE.md` is German.
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

See `docs/AGENTS_*.md` and `ARCHITECTURE.md` for file-level maps.

## Gotchas

- Migrations run on Nitro boot (`server/plugins/00-database-migration.ts`) — restart dev after schema changes.
- Performance tasks auto-complete after `performanceTimeoutMinutes` (`server/plugins/01-performance-timeout.ts`).
- `pnpm db:seed` reads `web/data/demo-stations.json`; import API for admin is YAML-shaped JSON.
- iOS QR: prefer `@zxing/browser` fallback when `BarcodeDetector` missing (`StationQrScanner.vue`).
- Rejoin invalidates prior team session token (single active device per team).

## Docs

- Product scope & flows: [`docs/SCOPE.md`](docs/SCOPE.md)
- Boundaries & codemap: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Area guides: [`docs/AGENTS_APP.md`](docs/AGENTS_APP.md), [`docs/AGENTS_SERVER.md`](docs/AGENTS_SERVER.md), [`docs/AGENTS_ARCHITECTURE.md`](docs/AGENTS_ARCHITECTURE.md)
