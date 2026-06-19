---
audience: agent
category: codemap
type: Codemap
last_verified: 2026-06-19
load-when: Any server/API, DB, middleware, session, or Nitro handler change.
sources:
  - web/server/
  - web/shared/
sources_stamp: 3aa4e0cbae9a5593e2b408493471be3a56c9b404
---
# Server codemap

SSOT for Nitro API routes, services, DB, middleware, and server utils. System shape and turn loop: [`AGENTS_ARCHITECTURE.md`](./AGENTS_ARCHITECTURE.md).

## Layering

| Layer | Path | Role |
| ----- | ---- | ---- |
| Handlers | `web/server/api/` | Thin REST — auth, Zod validation, delegate to services |
| Domain | `web/server/services/` | Turn loop, coop, crew, media, onboarding, admin lists |
| Persistence | `web/server/database/` | Drizzle schema + versioned SQLite migrations |
| Cross-cutting | `web/server/middleware/`, `plugins/`, `utils/` | CSRF, rate limits, boot hooks, sessions, DB access |
| Shared pure | `web/shared/` | Types, Zod, scoring — importable from handlers and app via `#shared/*` |

Handlers MUST NOT embed game rules; call `web/server/services/game.ts` and `web/shared/scoring.ts`.

## Services (domain SSOT)

| File | Owns |
| ---- | ---- |
| `game.ts` | Roll, scan, hints, quiz answer, confirm, abandon, continue-playing, overflow |
| `turn-scan.ts` | Scan validation and activity-type branch dispatch |
| `coop.ts` | Co-op depot lifecycle (Model B), partner wait, bonus link |
| `crew.ts` | Crew session, pending queue, performance/media rating |
| `media-submission.ts` | Upload storage under `database/uploads/submissions/` |
| `team-onboarding.ts` | Avatar, motto, onboarding gates |
| `team-directory.ts` | Public team directory for edition |
| `admin-teams.ts` | Organizer team list and PIN overrides |

## API routes

### Player / team session

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| GET | `/api/me` | Team state poll — open turn, coop items, onboarding |
| GET | `/api/leaderboard` | Edition highscore |
| GET | `/api/editions/public` | Live edition picker |
| GET | `/api/editions/by-slug/:slug/public` | Edition metadata for slug routes |
| POST | `/api/teams` | Register team |
| POST | `/api/teams/rejoin` | Rejoin (invalidates prior session token) |
| PATCH | `/api/teams/pin` | Change team PIN |
| PATCH | `/api/teams/onboarding` | Avatar / motto |
| POST | `/api/teams/logout` | Clear team session |
| GET | `/api/teams/directory` | Public team list |

### Turn loop

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| POST | `/api/turns/roll` | Dice + path, overflow tracking |
| POST | `/api/turns/:id/scan` | Station QR → activity branch |
| POST | `/api/turns/:id/hint` | Reveal hint (quiz) |
| POST | `/api/turns/:id/answer` | Quiz answer |
| POST | `/api/turns/:id/submission` | Media upload metadata |
| POST | `/api/turns/:id/confirm` | Score + advance position |
| POST | `/api/turns/:id/abandon` | Zero-round abandon |
| POST | `/api/turns/:id/continue-playing` | Defer crew/coop wait |
| GET | `/api/turns/:id/score-summary` | Pre-confirm breakdown |
| POST | `/api/turns/:id/coop/complete` | Co-op station leg |
| POST | `/api/turns/:id/coop/continue-playing` | Defer partner bonus wait |

### Co-op (cross-turn)

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| POST | `/api/coop/link` | Team QR bonus after partner depot |

### Crew

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| POST | `/api/crew/login` | Edition PIN → crew session |
| GET | `/api/crew/session` | Current crew session |
| GET | `/api/crew/pending` | Approval queue |
| POST | `/api/crew/rate` | Performance/media rating |
| GET | `/api/crew/teams/search` | Team lookup |
| GET | `/api/crew/teams/resolve` | Team QR resolution |
| GET | `/api/crew/teams/:id` | Single-team crew view |
| POST | `/api/crew/teams/:id/reset-pin` | Crew PIN reset |
| GET | `/api/crew/submissions/:id/content` | Stream stored media |
| POST | `/api/crew/logout` | Clear crew session |

### Admin

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| POST | `/api/admin/init` | One-shot bootstrap |
| POST | `/api/admin/login` | Organizer session |
| POST | `/api/admin/logout` | Clear admin session |
| GET/POST | `/api/admin/editions` | List / create editions |
| PATCH | `/api/admin/editions/:id` | Edition config, status, branding |
| POST | `/api/admin/editions/:id/map` | Festival map upload |
| POST | `/api/admin/editions/:id/join-logo` | Join logo upload |
| GET/POST | `/api/admin/editions/:id/tasks` | Task CRUD + import |
| PATCH/DELETE | `/api/admin/editions/:id/tasks/:taskId` | Single task |
| POST | `/api/admin/editions/:id/fields/add` | Grow board |
| POST | `/api/admin/editions/:id/fields/remove` | Shrink board |
| GET | `/api/admin/editions/:id/qr/export` | Printable QR HTML |
| GET | `/api/admin/editions/:id/teams` | Team overview |
| GET | `/api/admin/editions/:id/checklist` | Pre-live checklist |
| PATCH | `/api/admin/teams/:id/pin` | Organizer PIN override |
| POST | `/api/admin/teams/:id/reset-pin` | Organizer PIN reset |

### Public / assets / ops

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| GET | `/api/public/team-qr` | Shareable team QR deep link |
| GET | `/api/uploads/editions/:filename` | Edition asset files |
| GET | `/api/health` | Health check |
| GET | `/api/metrics` | Metrics endpoint |

### Dev-only (`dev-only` guard)

| Method | Path | Handler focus |
| ------ | ---- | --------------- |
| POST | `/api/dev/turns/roll` | Test roll |
| POST | `/api/dev/turns/:id/simulate-scan` | Test scan |
| GET | `/api/dev/turns/:id/quiz-answer` | Test quiz answer |
| POST | `/api/dev/turns/:id/complete-performance` | Test performance complete |

## Database & boot

| Path | Role |
| ---- | ---- |
| `web/server/database/schema.ts` | Drizzle tables — edit → `pnpm db:generate` |
| `web/server/database/migrations/` | Versioned SQL (applied on Nitro boot) |
| `web/server/plugins/00-database-migration.ts` | Run migrations at startup |
| `web/server/plugins/01-performance-timeout.ts` | Auto-complete performance turns |
| `web/server/plugins/02-env-validation.ts` | Prod secret validation |

Env: `NUXT_SQLITE_DATABASE_PATH` (default `./server/database/db.sqlite` under `web/`).

## Middleware & security

| Path | Role |
| ---- | ---- |
| `web/server/middleware/` | CSRF origin check (prod), in-memory rate limits on auth/roll/turn |
| `web/server/utils/*-session.ts` | Team, crew, admin, staff cookie signing |
| `web/nuxt.config.ts` | `runtimeConfig` for secrets (server-only) |

## Where to change what

| Task | Start here |
| ---- | ---------- |
| Turn rules, roll/scan/confirm | `services/game.ts` + `api/turns/` |
| Co-op depots | `services/coop.ts`, `api/coop/`, `api/turns/:id/coop/` |
| Crew rating / queue | `services/crew.ts`, `api/crew/` |
| Media submissions | `services/media-submission.ts`, `api/turns/:id/submission.post.ts` |
| Team onboarding | `services/team-onboarding.ts`, `api/teams/onboarding.patch.ts` |
| Points formula | `web/shared/scoring.ts` (not server-only) |
| DB columns | `database/schema.ts` → `pnpm db:generate` |
| Edition config keys | `server/utils/edition-config.ts`, admin PATCH handler |

Per-folder one-liners: [`web/README.md`](../web/README.md) (server section).
