# Server plugins

**Purpose:** Nitro boot hooks — schema migrate, performance auto-complete, production env checks, startup banner.

- **00-database-migration.ts** — Runs Drizzle migrations on boot and backfills task content to localized JSON.
- **01-performance-timeout.ts** — Minute poll auto-completes awaiting_crew turns past `performanceTimeoutMinutes`.
- **02-env-validation.plugin.ts** — Validates production secrets and prints version/env startup banner.
