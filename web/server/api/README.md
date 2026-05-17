# REST API (Nitro)

**Purpose:** HTTP handlers under `/api/*` — auth gates, Zod parse, status codes; delegate to `server/services`.

- **health.get.ts** — liveness probe
- **leaderboard.get.ts** — public highscore by confirmed position
- **me.get.ts** — team session payload (open turn, edition, board state)
- **teams/** — create team, rejoin, PIN change
- **turns/** — roll, hint, scan, answer, confirm, abandon
- **editions/** — public edition metadata by id or slug
- **crew/** — staff login, pending performances, rate, team tools
- **admin/** — bootstrap, editions CRUD, stations import, QR export
- **public/** — team QR image generation
- **uploads/** — serve edition map images
- **dev/** — dev-only turn simulation helpers

## Change X → file

| Change | Start at |
|--------|----------|
| New route | `api/<area>/<name>.<method>.ts` |
| Roll / scan / confirm | `turns/`, `services/game.ts` |
| Crew rate / PIN | `crew/`, `services/crew.ts` |
| Admin import / checklist | `admin/editions/[id]/` |
| Team session | `utils/team-session.ts` |

## Route tree (overview)

`health`, `me`, `leaderboard`, `editions/*`, `teams/*`, `turns/*`, `crew/*`, `admin/*`, `public/team-qr`, `uploads/editions/*`, `dev/turns/*` — see per-subfolder READMEs.

**Depends on:** `server/services`, `server/utils/*-session`, `#shared/schemas`
