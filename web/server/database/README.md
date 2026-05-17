# Database layer

**Purpose:** Drizzle ORM schema and SQLite migrations for editions, stations, teams, turns, and crew ratings.

- **schema.ts** — tables: `editions`, `stations`, `teams`, `turns`, `crew_ratings` with relations and unique constraints
- **migrations/** — generated SQL migration chain applied on Nitro boot

**Depends on:** drizzle-orm sqlite column types only

**Used by:** `server/services`, `server/utils/db`, admin import handlers
