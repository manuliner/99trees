# Server plugins

**Purpose:** Nitro lifecycle hooks — migrations, timeouts, env validation.

- **00-database-migration.ts** — runs Drizzle migrations on startup
- **01-performance-timeout.ts** — auto-completes stale performance (and related) turns
- **02-env-validation.plugin.ts** — warns on weak session secrets in non-dev
