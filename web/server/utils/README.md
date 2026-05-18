# Server utils

**Purpose:** Shared server helpers — database access, sessions, edition config, task import/serialization, paths, and guards.

- **db.ts** — Lazy Drizzle SQLite singleton from runtime config path.
- **resolve-sqlite-path.ts** — Resolves DB file, web root, and repo-relative paths.
- **team-session.ts**, **crew-session.ts**, **admin-session.ts**, **staff-session.ts** — httpOnly session cookies for teams, crew, admin, and staff scope.
- **edition-config.ts**, **edition-live.ts**, **edition-slug.ts** — Edition config parse, live guard, and slug uniqueness.
- **admin-task.ts**, **admin-task-import.ts**, **migrate-task-i18n.ts** — Task DTO mapping, bulk import planning, and i18n content migration.
- **parse-body.ts**, **dev-only.ts**, **logger.ts** — Zod body parse, dev gate, and structured game event logs.
