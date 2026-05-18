# Admin edition tasks API

**Purpose:** CRUD and bulk import of edition tasks (quiz/performance) with localized hints and activity payloads.

- **index.get.ts** — Lists tasks ordered by field number as admin DTOs.
- **index.post.ts** — Creates one task with generated slug, QR token, and optional field-count bump.
- **import.post.ts** — Bulk YAML-shaped import with optional overwrite and field-count sync.
- **[taskId].patch.ts** — Updates task hints, map coords, slug, and activity content.
