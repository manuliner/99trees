# Uploads editions API

**Purpose:** Serves uploaded edition map images from disk beside the SQLite database.

- **[filename].get.ts** — Streams png/jpg/webp with cache headers; rejects path traversal.
