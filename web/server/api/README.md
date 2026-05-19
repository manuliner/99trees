# HTTP API (root)

**Purpose:** Top-level Nitro handlers not scoped to a subfolder.

- **me.get.ts** — authenticated team state via `buildMePayload`
- **health.get.ts** — liveness, version, environment label
- **leaderboard.get.ts** — confirmed positions and scores per edition
