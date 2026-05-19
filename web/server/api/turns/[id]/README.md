# Turn API

**Purpose:** Mutations on the team's open turn — scan, hints, quiz, media, coop, confirm, abandon.

- **scan.post.ts** — task QR; branches activity type including coop depot
- **hint.post.ts** — timed hints or reveal-all with deductions
- **answer.post.ts** — quiz answer; auto-confirms on success
- **submission.post.ts** — multipart media upload for `media` tasks
- **confirm.post.ts** — applies score and board position
- **continue-playing.post.ts** — defer performance crew wait to background
- **abandon.post.ts** — zero-round abandon; restores overflow snapshot
- **score-summary.get.ts** — breakdown for a completed turn
