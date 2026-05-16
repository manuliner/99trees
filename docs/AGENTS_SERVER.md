# Codemap — `web/server/`

Nitro API + Drizzle + SQLite. Handlers stay thin; game rules in `services/`.

## Change X → file

| Change | File |
|--------|------|
| New HTTP route | `api/<area>/<name>.<method>.ts` (file-based routing) |
| Roll / move / skip completed fields | `services/game.ts` → `resolvePendingPosition`, `rollDice` |
| Hint timers / reveal-all cost | `services/game.ts` + `utils/edition-config.ts` |
| Scan validation (wrong station) | `api/turns/[id]/scan.post.ts` + `game.ts` |
| Quiz normalize / check answers | `api/turns/[id]/answer.post.ts` |
| Confirm turn + score_total | `api/turns/[id]/confirm.post.ts` + `calculateTurnScore` |
| Crew rating + bonus +25 | `services/crew.ts`, `api/crew/rate.post.ts` |
| PIN reset | `api/crew/teams/[id]/reset-pin.post.ts` |
| Admin station import | `api/admin/editions/[id]/stations/import.post.ts` |
| Edition go-live checklist | `api/admin/editions/[id]/checklist.get.ts` |
| Team session cookie | `utils/team-session.ts` |
| Schema / columns | `database/schema.ts` → `pnpm db:generate` |

## API tree (current)

```
api/
  health.get.ts
  me.get.ts
  leaderboard.get.ts
  editions/[id]/public.get.ts
  teams/index.post.ts, rejoin.post.ts, pin.patch.ts
  turns/roll.post.ts
  turns/[id]/hint|scan|answer|confirm|abandon.post.ts
  crew/login|logout.post.ts, pending.get.ts, rate.post.ts
  crew/teams/search.get.ts, resolve.get.ts, [id].get.ts, [id]/reset-pin.post.ts
  admin/init|login.post.ts
  admin/editions/index.get|post.ts, [id].patch.ts, [id]/checklist.get.ts
  admin/editions/[id]/stations/import.post.ts
```

## Services

- **`game.ts`** — edition/team load, open turn, `buildMePayload` (client snapshot), position math, station lookup.
- **`crew.ts`** — team search, resolve QR, rate performance turn, audit-friendly PIN reset.

## Plugins

| Plugin | Role |
|--------|------|
| `00-database-migration.ts` | Applies Drizzle migrations on startup |
| `01-performance-timeout.ts` | Every 60s: `awaiting_crew` → `completed` after edition timeout |

## DB

- Schema: `database/schema.ts`
- Migrations: `database/migrations/`
- Connection: `utils/db.ts` (path from `runtimeConfig.sqliteDatabasePath`)

## Shared contracts

Import `#shared/schemas`, `#shared/scoring`, `#shared/types` — keep Zod + score formula in sync with handlers.

## Auth cookies

| Cookie util | Routes |
|-------------|--------|
| `team-session.ts` | `/api/me`, `/api/turns/*`, `PATCH /api/teams/pin` |
| `crew-session.ts` | `/api/crew/*` except login |
| `admin-session.ts` | `/api/admin/*` except init/login |

## Seed / import

- `web/scripts/seed.mjs` — dev data from `web/data/demo-stations.json`
- Admin import expects station list shape compatible with seed JSON (field, slug, hints, task)
