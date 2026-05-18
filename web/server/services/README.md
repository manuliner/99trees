# Server services

**Purpose:** Domain orchestration for editions, turns, crew workflows, and admin team views — shared by Nitro handlers and plugins.

- **game.ts** — Edition lookup, dice roll helpers, `/api/me` payload, hint deductions, board highlights, turn confirm and score summary.
- **crew.ts** — Crew team search, QR resolve, team detail, performance rating with auto-confirm, pending queue, PIN reset.
- **admin-teams.ts** — Admin edition team list with open-turn state and progress counts.
- **turn-scan.ts** — Validates task QR scan and advances turn to scanned or awaiting_crew.
