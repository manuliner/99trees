# Nitro plugins

**Purpose:** Server startup hooks — migrations, performance timeouts, env validation.

- **00-database-migration.ts** — runs Drizzle migrations on boot
- **01-performance-timeout.ts** — polls and auto-completes overdue performance turns
- **02-env-validation.plugin.ts** — fails fast when required runtime env vars missing in production
