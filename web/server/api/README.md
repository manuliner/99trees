# HTTP API (root)

**Purpose:** Top-level Nitro handlers not scoped to a subfolder.

- **me.get.ts** — authenticated team state via `buildMePayload`
- **health.get.ts** — liveness; prod returns `{ status: "ok" }` when SQLite is reachable
- **metrics.get.ts** — Prometheus scrape endpoint (`NUXT_METRICS_ENABLED`)
- **leaderboard.get.ts** — confirmed positions and scores per edition
