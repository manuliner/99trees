# Server utilities

**Purpose:** Cross-cutting helpers — DB singleton, sessions, edition config, parsing, paths, dev guards.

- **db.ts** — `getDb()` Drizzle + better-sqlite3 singleton
- **team-session.ts** — team cookie, `requireTeam`, completed-fields JSON helpers
- **crew-session.ts** — crew edition cookie and password verify
- **admin-session.ts** — admin login session get/set/clear
- **staff-session.ts** — staff/crew edition scoping for multi-edition routes
- **edition-config.ts** — `parseEditionConfig` from `configJson`
- **edition-live.ts** — `assertEditionLive` status guard
- **edition-slug.ts** — unique slug generation and availability checks
- **admin-station.ts** — station row mapping and hint/task JSON builders
- **admin-station-import.ts** — import merge plan and field conflict checks
- **parse-body.ts** — Zod body parse with 400 on failure
- **resolve-sqlite-path.ts** — resolves `NUXT_SQLITE_DATABASE_PATH` under web root
- **dev-only.ts** — throws unless dev environment
- **logger.ts** — structured game event logging

**Used by:** `server/services`, `server/api`, `server/plugins`
