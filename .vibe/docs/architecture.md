# Architecture — 99trees (Zugvögel)

## Introduction and goals

Festival field-game PWA: teams roll dice, scan task QR codes, complete quiz, performance, coop, or media activities, earn points. Crew rates performances and media; admin configures editions; leaderboard uses confirmed positions only.

## Context and scope

- **In scope:** Nuxt 4 (`web/app` + `web/server` + `web/shared`), SQLite, httpOnly cookies, player i18n (DE default / EN).
- **Out of scope:** Multi-tenant SaaS, external auth, websockets (poll `GET /api/me`).

## Building block view

| Layer | Responsibility |
|-------|----------------|
| `web/app/pages` | Routes — play, join, onboarding, crew, admin; reflect `/api/me` |
| `web/app/components/pixel` | Board, map, dice, hints, avatars, goal celebration |
| `web/app/components/admin` | Edition setup — tasks, fields, teams, map, QR, join hero |
| `web/app/composables` | API client, edition theme, onboarding gate, localized content |
| `web/server/api` | Thin HTTP — Zod, CSRF on mutations, delegate to services |
| `web/server/services` | Turns, coop depots, media files, crew queue, onboarding |
| `web/server/database` | Drizzle schema — coop_depots, turn_submissions, overflow |
| `web/shared` | Types, schemas, scoring, palettes, media limits, board layout |

## Runtime view

**Play:** roll → pending field (overflow tracked) → hints → scan → activity branch (quiz / performance / coop / media) → crew rate if needed → confirm → score and field complete. **Coop:** initiator opens depot; partner joins same field; team-QR link pays bonus. **Onboarding:** avatar/motto before first roll.

**Turn states:** `rolled` → `scanned` → (`awaiting_crew` | `awaiting_coop`) → `completed`; background variants `*_bg`; abandon from `rolled` restores overflow snapshot.

## Crosscutting

- **Sessions:** team, crew (per-edition token), admin — separate cookies; rejoin invalidates team token.
- **Edition config:** dice, hints, performance timeout, coop bonus, color palette; join logo via uploads API.
- **Security:** CSRF origin middleware, rate limits, production CSP headers.
- **Scoring:** `#shared/scoring` only; media and performance share crew approval actions.

## Decisions

Server owns game state; app never imports `web/server`. Edition slugs in URLs (`/:edition/play`). API → services → db; pixel components are presentation-only.
