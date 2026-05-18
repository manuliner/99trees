# Dev turn API

**Purpose:** Dev/test-only shortcuts to simulate scans, reveal quiz answers, and skip crew rating.

- **simulate-scan.post.ts** — Auto-scans correct task QR for pending field (dev gate).
- **quiz-answer.get.ts** — Returns first correct quiz answer for active scanned turn.
- **complete-performance.post.ts** — Auto-rates awaiting_crew performance as ok.
