# Admin edition API

**Purpose:** Configure a single edition — status, slug, crew password, go-live checks, map upload.

- **[id].patch.ts** — Updates edition fields; validates tasks, map, slug, and crew before going live.
- **checklist.get.ts** — Pre-live readiness report (tasks, fields, crew password, map, slug).
- **map.post.ts** — Multipart festival map upload beside SQLite data dir.
