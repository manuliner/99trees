# Server services

**Purpose:** Domain orchestration for game turns, crew ratings, admin teams, and QR scan handling — called from thin `server/api` handlers.

**game.ts** — edition/team lookups, `getOpenTurn`, dice roll, position resolution, turn lifecycle (hint/scan/answer/confirm/abandon), `buildMePayload`

**crew.ts** — crew login verification, pending performance queue, team search/resolve, rating and PIN reset

**turn-scan.ts** — validates station QR token against turn state and advances scan phase

**admin-teams.ts** — admin listing and PIN updates for teams

**Depends on:** `server/database/schema`, `server/utils/*-session`, `#shared/scoring`, `#shared/types`

**Used by:** `server/api/turns`, `server/api/crew`, `server/api/teams`, `server/api/admin`

## Change X → file

| Change | File |
|--------|------|
| Roll / skip completed fields | `game.ts` → `resolvePendingPosition` |
| Hint timers / costs | `game.ts`, `utils/edition-config.ts` |
| Scan validation | `turn-scan.ts`, `api/turns/[id]/scan.post.ts` |
| Confirm + score | `game.ts`, `#shared/scoring` |
| Crew rating + bonus | `crew.ts` |
| Schema columns | `database/schema.ts` → `pnpm db:generate` |
