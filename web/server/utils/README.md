# Server utilities

**Purpose:** DB access, sessions, edition/task admin helpers, security and path resolution.

- **db.ts** — Drizzle client singleton
- **team-session.ts** / **crew-session.ts** / **admin-session.ts** / **staff-session.ts** — httpOnly cookies
- **edition-config.ts** / **edition-live.ts** — parse config JSON, live-edition guard
- **admin-task.ts** / **admin-task-import.ts** — CRUD and YAML-shaped import
- **admin-board-edit.ts** / **admin-task-field-shift.ts** — add/remove fields, renumber tasks
- **client-ip.ts** / **runtime-env.ts** / **dev-only.ts** — rate limit IP, env label, dev gates
- **html-escape.ts** — safe strings for QR HTML export
