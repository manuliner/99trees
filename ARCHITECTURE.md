# ARCHITECTURE.md — 99trees

Single Nuxt 4 application: Team PWA, Crew UI, public Leaderboard, minimal Admin.

```mermaid
flowchart TB
  Client[Browser PWA] --> Nuxt[Nuxt app]
  Nuxt --> API[Nitro /api]
  Nuxt --> Shared[web/shared]
  API --> Shared
  API --> SQLite[(SQLite)]
```

## Layers

- **app/** — pages, pixel components, composables
- **server/api/** — REST handlers
- **server/services/** — game logic, auth
- **shared/** — scoring, Zod schemas, types

## Auth (MVP)

- **Teams:** opaque session cookie after join/rejoin (PIN)
- **Crew:** crew session cookie after password login
- **Admin:** init secret + session (minimal)
