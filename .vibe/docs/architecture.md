# Architecture — 99trees (Zugvögel)

## Introduction and goals

Festival field-game PWA: teams roll dice, scan station QR codes, complete quiz/performance tasks, earn points. Crew rates performances; admin configures editions; public leaderboard uses confirmed positions only.

## Context and scope

- **In scope:** Nuxt 4 monolith (`web/app` + `web/server` + `web/shared`), SQLite, httpOnly cookies (team / crew / admin).
- **Out of scope:** Multi-tenant SaaS, external auth, websockets (client polls `GET /api/me`).

## Building block view

| Layer | Responsibility |
|-------|----------------|
| `web/app` | Pages, pixel UI, composables — reflects server state |
| `web/server/api` | Thin HTTP — Zod, auth, delegate |
| `web/server/services` | Turn lifecycle, crew queue, scoring orchestration |
| `web/server/database` | Drizzle schema + migrations |
| `web/shared` | Pure types, schemas, `calculateTurnScore` |

## Runtime view

**Play:** roll → pending field → hints → scan QR → quiz/performance → crew rate if needed → confirm → score applied, field completed.

**Turn states:** `rolled` → `scanned` → (`awaiting_crew`) → `completed` → confirm → idle; `abandon` from `rolled` (zero delta). Open turn blocks new rolls (`getOpenTurn` in `game.ts`).

## Crosscutting

- **Sessions:** Separate cookies per role; rejoin invalidates prior team token.
- **Edition config:** `configJson` — dice, hints, performance timeout.
- **Plugins:** migrations on boot; performance timeout poll (~60s).
- **Scoring:** `#shared/scoring` only — server authoritative.

## Decisions

- Server owns position, dice, points — no trusted client mutations.
- `web/app` must not import `web/server`; shared logic in `web/shared`.
- Edition URL slugs (`/[edition]/join`) decouple routing from numeric ids.
- API → services → db; shared has no DB/framework imports.
