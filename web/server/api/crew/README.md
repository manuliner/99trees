# Crew API

**Purpose:** Festival crew session — login, logout, session probe, and performance approval queue.

- **login.post.ts** — Edition crew password login and session cookie.
- **logout.post.ts** — Clears crew session cookie.
- **session.get.ts** — Returns bound edition id and slug for active crew session.
- **pending.get.ts** — Staff-scoped list of turns awaiting performance rating.
- **rate.post.ts** — Rates performance turn (crew or admin) and logs event.
