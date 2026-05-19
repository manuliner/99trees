# Database

**Purpose:** Drizzle schema and versioned SQLite migrations applied on Nitro boot.

- **schema.ts** — editions (join hero), tasks, teams (overflow, onboarding), turns, coop_depots, turn_submissions
- **migrations/** — `0009` join hero through `0014` crew session token
- **uploads/** — edition maps and submission media (gitignored blobs, `.gitkeep` only in repo)
