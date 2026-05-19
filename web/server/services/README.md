# Server services

**Purpose:** Domain orchestration — turns, coop depots, media submissions, crew queue, onboarding, admin lists.

- **game.ts** — roll/create turn, overflow fields, `buildMePayload`, confirm, performance continue
- **coop.ts** — depot lifecycle, partner complete, team-QR bonus link, pending coop items
- **media-submission.ts** — store/retrieve turn photo/video files for crew review
- **turn-scan.ts** — QR scan branches for quiz, performance, coop initiator/partner, media
- **crew.ts** — search, rate performance/media, pending approvals, PIN reset
- **team-onboarding.ts** — avatar/motto patch and completion gate
- **team-directory.ts** — edition team list for onboarding picker
- **admin-teams.ts** — admin team list with open-turn summary
