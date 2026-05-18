# Server API

**Purpose:** Nitro REST entry points — thin handlers delegating to services and utils; root-level player and ops routes.

- **me.get.ts** — Authenticated team snapshot via `buildMePayload`.
- **health.get.ts** — Liveness JSON with version, build time, and environment.
- **leaderboard.get.ts** — Edition ranking with official vs in-progress rules when ended.
