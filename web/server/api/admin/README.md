# Admin API

**Purpose:** Organizer authentication and one-shot bootstrap for the admin backoffice.

- **login.post.ts** — Email/password login and admin session cookie.
- **logout.post.ts** — Clears admin session after auth check.
- **init.post.ts** — One-shot first admin user when init secret matches.
