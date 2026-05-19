# Shared domain layer

**Purpose:** Pure TypeScript for app and server — types, Zod, scoring, board layout, media/coop payloads; no DB.

- **types.ts** — editions, turns (`awaiting_coop`, media), coop depots, onboarding DTOs
- **schemas.ts** — team onboarding, coop link, admin task activity (`quiz|performance|coop|media`)
- **scoring.ts** — turn score, hint penalty, coop link bonus from edition config
- **quiz-payload.ts** — parse/build activity payloads; team-safe stripping and grading
- **board-overflow.ts** — restore overflow snapshot on zero-round abandon
- **pixel-palettes.ts** — edition color palette ids and CSS var names
- **media-limits.ts** / **media-transcode-passes.ts** — upload caps and ffmpeg arg presets
- **team-avatars.ts** — bird/meme avatar ids and image paths
- **edition-board-checklist.ts** / **activity-board-letter.ts** — admin checklist and board letters
