# App pages

**Purpose:** Nuxt file-based routes (English UI). Game state from `GET /api/me` — do not duplicate server rules in pages.

## Public and team

- **index.vue** — landing; lists live editions
- **[edition]/join.vue**, **rejoin.vue** — create team / PIN rejoin (slug in path)
- **play.vue** — main game: roll, hints, scan, quiz/perf, confirm; expandable festival map fullscreen
- **leaderboard.vue** — public ranking (poll)
- **privacy.vue**, legacy **join.vue** / **rejoin.vue** — redirects via `useLegacyEditionRedirect`
- **s/[slug].vue** — station QR deep-link → play with query
- **t/[slug].vue** — team QR deep-link

## Crew and admin

- **[edition]/crew/login.vue**, **crew/index.vue**, **crew/teams/[id].vue** — staff login, pending queue, rate/PIN
- **admin/index.vue**, **init.vue**, **login.vue** — edition checklist, bootstrap, auth

## Change X → file

| Change | File |
|--------|------|
| Dice / hint / confirm UX | `play.vue` |
| Join / PIN UI | `[edition]/join.vue`, `rejoin.vue` |
| Score popups | `useScoreFeedback.ts`, `pixel/ScoreFlash.vue` |
| Board / festival map | `pixel/GameBoard.vue`, `FestivalMap*.vue` |
| QR scanner | `StationQrScanner.vue` |
| Edition missing state | `EditionMissing.vue` |

**Depends on:** `app/composables`, `app/components/pixel`, `#shared/edition-urls`
