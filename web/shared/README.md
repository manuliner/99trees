# Shared domain layer

**Purpose:** Pure TypeScript shared by Nuxt app and Nitro server — types, Zod schemas, scoring, localized content, URL helpers; no DB imports.

- **types.ts** — edition config, turn states, task payloads, admin/staff DTO shapes
- **schemas.ts** — Zod request/response contracts for API handlers and admin task import
- **localized.ts** — `LocalizedString`/`LocalizedStringList`, normalize and resolve by `AppLocale`
- **scoring.ts** — `calculateTurnScore`, `timeBonusFromScan`, `hintPenalty` (base 100 + bonuses − penalties)
- **quiz-payload.ts** — team-safe quiz stripping, answer normalization, locale-aware grading
- **edition-urls.ts** — edition slug parsing, reserved slugs, team/task QR path builders
- **task-slug.ts** — slugify from activity text, uniqueness within edition import
- **game-board-layout.ts** — `computeGameBoardLayout`, orthogonal serpentine path for board UI
- **admin-task-import.ts** — map admin tasks ↔ YAML-shaped import document

**Depends on:** nothing in `web/server` or Vue
