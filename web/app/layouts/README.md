# App layouts

**Purpose:** Nuxt layout shells — shared chrome, nav, and role-specific wrappers.

- **default.vue** — team/public pages (play, join, leaderboard)
- **crew.vue** — crew session pages (`/[edition]/crew/*`)
- **admin.vue** — admin backoffice (`/admin/*`)

**Depends on:** composables for edition context; no direct server imports.
