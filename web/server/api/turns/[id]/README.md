# Turn API

**Purpose:** Mutations on the team's open turn — scan, hints, quiz, confirm, abandon, score recap.

- **scan.post.ts** — Validates task QR and advances turn state.
- **hint.post.ts** — Reveals timed hints or reveal-all with point deductions.
- **answer.post.ts** — Submits quiz answer; auto-confirms on success.
- **confirm.post.ts** — Confirms completed turn and updates team position/score.
- **abandon.post.ts** — Zero-round abandon with hint penalty settlement.
- **score-summary.get.ts** — Breakdown for a confirmed turn.
