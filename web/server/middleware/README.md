# Server middleware

**Purpose:** Nitro route middleware for API protection and abuse limits.

- **rate-limit.ts** — per-IP limits on auth and mutation routes
- **csrf-origin.ts** — rejects cross-origin POST/PATCH/DELETE without matching Origin/Referer
