# Shared domain layer

**Purpose:** Pure TypeScript shared by Nuxt app and Nitro server — types, Zod schemas, scoring, URL helpers, no DB imports.

- **types.ts** — `EditionConfig`, `TurnState`, task payloads, admin/staff DTO shapes
- **schemas.ts** — Zod request/response contracts for API handlers
- **scoring.ts** — `calculateTurnScore`, `timeBonusFromScan`, `hintPenalty` (base 100 + bonuses − penalties)
- **edition-urls.ts** — edition slug parsing and team QR path builders
- **station-slug.ts** — slug normalization for stations
- **game-board-layout.ts** — board cell layout constants for UI
- **admin-station-import.ts** — shared validation types for station import

**Depends on:** nothing in `web/server` or Vue
