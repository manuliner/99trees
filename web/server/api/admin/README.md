# Admin API

**Purpose:** Organizer backoffice — bootstrap, login, edition and station management.

- **init.post.ts** — one-shot admin account creation via env secret
- **login.post.ts** — admin session cookie
- **logout.post.ts** — clear admin session
- **editions/** — CRUD, checklist, map upload, station import, QR export
- **teams/** — per-team admin actions (PIN)
