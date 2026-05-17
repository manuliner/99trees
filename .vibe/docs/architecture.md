# Architecture — 99trees (Zugvögel)

## Introduction and goals

Festival field-game PWA: teams roll dice, scan station QR codes, complete quiz/performance tasks, earn points. Crew rates performances; admin configures editions; public leaderboard uses confirmed positions only.

## Context and scope

- **In scope:** Nuxt 4 (`web/app` + `web/server` + `web/shared`), SQLite, httpOnly cookies.
- **Out of scope:** Multi-tenant SaaS, external auth, websockets (poll `GET /api/me`).

## Building block view

| Layer | Responsibility |
|-------|----------------|
| `web/app/pages` | Routes — play, join, crew, admin; reflect `/api/me` |
| `web/app/components/pixel` | Board, festival map, dice, hints, dialogs |
| `web/app/components/admin` | Edition setup sections (stations, teams, map, QR) |
| `web/app/composables` | API client, edition slug, play/admin UX helpers |
| `web/app/layouts` | Shells — default, crew, admin |
| `web/server/api` | Thin HTTP — Zod, auth, delegate |
| `web/server/services` | Turn lifecycle, crew queue, scoring orchestration |
| `web/server/database` | Drizzle schema + migrations |
| `web/shared` | Types, schemas, scoring, board layout, URL helpers |

## Runtime view

**Play:** roll → pending field → hints (optional, point cost) → scan QR → quiz/performance → crew rate if needed → confirm → score applied, field completed. UI shows serpentine `GameBoard`, optional festival map (preview + fullscreen pan/zoom).

**Turn states:** `rolled` → `scanned` → (`awaiting_crew`) → `completed` → confirm → idle; `abandon` from `rolled` (zero delta). Open turn blocks new rolls.

## Crosscutting

- **Sessions:** Separate cookies per role; rejoin invalidates prior team token.
- **Edition config:** `configJson` — dice, hints, performance timeout; map image via uploads API.
- **Plugins:** migrations on boot; performance timeout poll.
- **Scoring:** `#shared/scoring` only; hints may deduct on claim.

## Decisions

Server owns game state; app never imports `web/server`. Edition slugs in URLs. API → services → db; UI components are presentation-only.
