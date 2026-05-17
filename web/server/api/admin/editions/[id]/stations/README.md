# Admin edition stations API

**Purpose:** Station CRUD and bulk import for an edition.

- **index.get.ts** — list stations with task payloads for admin UI
- **index.post.ts** — create station on a field number
- **import.post.ts** — merge import from JSON/YAML-shaped file (keeps QR tokens on update)
- **[stationId].patch.ts** — update hints, map position, task content
