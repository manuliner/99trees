# Module Index

**Purpose:** One-line map of documented modules under `web/`. Load full READMEs only for directories relevant to the current task.

- **shared**: Pure types, Zod schemas, scoring, board layout, URL helpers
- **app/pages**: Nuxt routes — join, play, crew, admin, deep links
- **app/components/pixel**: Pixel UI — board, festival map, dice, dialogs, hints
- **app/components/admin**: Organizer edition sections — tasks, teams, map, QR
- **app/composables**: API, edition routes, admin, play UX, festival map view
- **app/layouts**: Nuxt layout shells — default, crew, admin
- **app/plugins**: Client-only Nuxt plugins (PWA)
- **app/utils**: Small formatting helpers for UI
- **server/services**: Game, crew, scan, admin-teams domain logic
- **server/utils**: DB, sessions, edition config, parsing, paths
- **server/database**: Drizzle schema and migrations
- **server/plugins**: Boot migrations, performance timeout, env validation
- **server/middleware**: API rate limiting
- **server/api**: Nitro REST handlers (thin — delegate to services)
- **server/api/admin**: Organizer backoffice
- **server/api/admin/editions**: List and create editions
- **server/api/admin/editions/[id]**: Single edition configure and operate
- **server/api/admin/editions/[id]/qr**: Printable QR packs
- **server/api/admin/editions/[id]/tasks**: Task CRUD and import
- **server/api/admin/editions/[id]/teams**: Teams list for edition
- **server/api/admin/teams/[id]**: Single-team admin overrides
- **server/api/crew**: Crew session endpoints
- **server/api/crew/teams**: Crew team search and detail
- **server/api/crew/teams/[id]**: Crew single-team operations
- **server/api/dev/turns/[id]**: Dev turn shortcuts
- **server/api/editions**: Public edition metadata
- **server/api/editions/[id]**: Single edition public payload
- **server/api/editions/by-slug/[slug]**: Edition lookup by URL slug
- **server/api/public**: Unauthenticated shareable assets
- **server/api/teams**: Team register, rejoin, PIN
- **server/api/turns**: Turn lifecycle for teams
- **server/api/turns/[id]**: Open turn mutations
- **server/api/uploads/editions**: Uploaded map images from disk
