# Turn by ID API

**Purpose:** Mutations on an open turn (`rolled` → `scanned` → `completed` / crew / abandon).

- **hint.post.ts** — activate wait or reveal-all hint mode
- **scan.post.ts** — validate station QR and attach station
- **answer.post.ts** — submit quiz answer attempts
- **confirm.post.ts** — finalize score and advance team position
- **abandon.post.ts** — zero-round abandon from `rolled`
