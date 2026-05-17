# Module Index

**Purpose:** One-line map of documented modules under `web/`. Load full READMEs only for directories relevant to the current task.

- **shared**: Pure types, Zod schemas, scoring, URL helpers — no DB
- **app/pages**: Nuxt routes — join, play, crew, admin, deep links
- **app/components/pixel**: Pixel UI — board, dice, dialogs, hints
- **app/composables**: Vue composables for API, edition routes, admin, play UX
- **app/plugins**: Client-only Nuxt plugins (PWA)
- **app/utils**: Small formatting helpers for UI
- **server/services**: Game, crew, scan, admin-teams domain logic
- **server/utils**: DB, sessions, edition config, parsing, paths
- **server/database**: Drizzle schema and migrations
- **server/plugins**: Boot migrations, performance timeout, env validation
- **server/middleware**: API rate limiting
- **server/api**: Nitro REST handlers (thin — delegate to services)
