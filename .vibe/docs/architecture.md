# Architecture — 99trees (Zugvögel)

## Introduction and goals

Festival field-game PWA: teams roll dice, scan task QR codes, complete quiz/performance activities, earn points. Crew rates performances; admin configures editions; public leaderboard uses confirmed positions only.

## Context and scope

- **In scope:** Nuxt 4 (`web/app` + `web/server` + `web/shared`), SQLite, httpOnly cookies, player i18n (DE default / EN).
- **Out of scope:** Multi-tenant SaaS, external auth, websockets (poll `GET /api/me`).

## Building block view

| Layer | Responsibility |
|-------|----------------|
| `web/app/pages` | Routes — play, join, crew, admin; reflect `/api/me` |
| `web/app/components/pixel` | Board, festival map, dice, hints, dialogs, goal celebration |
| `web/app/components/admin` | Edition setup — tasks, teams, map, QR print pack |
| `web/app/composables` | API client, edition slug, localized task content, play/admin UX |
| `web/app/layouts` | Shells — player (i18n), default, crew, admin |
| `web/i18n` | Player UI strings; task content is bilingual edition data |
| `web/server/api` | Thin HTTP — Zod, auth, delegate |
| `web/server/services` | Turn lifecycle, crew queue, scoring orchestration |
| `web/server/database` | Drizzle schema + migrations (tasks, teams, turns) |
| `web/shared` | Types, schemas, scoring, localized helpers, board layout |

## Runtime view

**Play:** roll → pending field → hints (optional, point cost) → scan task QR → quiz/performance → crew rate if needed → confirm → score applied, field completed. UI shows serpentine `GameBoard`, optional festival map (preview + fullscreen pan/zoom), goal celebration on first finish.

**Turn states:** `rolled` → `scanned` → (`awaiting_crew`) → `completed` → confirm → idle; `abandon` from `rolled` (zero delta). Open turn blocks new rolls.

## Crosscutting

- **Sessions:** Separate cookies per role; rejoin invalidates prior team token.
- **Edition config:** `configJson` — dice, hints, performance timeout; map image via uploads API.
- **Plugins:** migrations on boot; performance timeout poll; env validation.
- **Scoring:** `#shared/scoring` only; hints may deduct on claim.
- **Localization:** Player chrome via `@nuxtjs/i18n`; task hints/quiz text via `useLocalizedContent` and `LocalizedString` fields.

## Decisions

Server owns game state; app never imports `web/server`. Edition slugs in URLs (`/:edition/play`). API → services → db; pixel components are presentation-only.
