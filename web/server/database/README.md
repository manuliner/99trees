# Server database

**Purpose:** Drizzle SQLite schema and versioned SQL migrations for editions, tasks, teams, turns, and staff tables.

- **schema.ts** — Tables: editions, tasks, teams, turns, admin_users, crew_ratings with relations and uniqueness constraints.
- **migrations/** — Drizzle migration chain (stations→tasks rename, i18n content, path highlights, overflow fields).
