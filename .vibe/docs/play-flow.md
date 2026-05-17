# Play flow

**Trigger:** Authenticated team on `/[edition]/play` polls `GET /api/me`.

## Components

`app/pages/play.vue` → `useGameApi` → `api/me.get` → `game.buildMePayload` → SQLite `teams` + `turns`

## Flow

1. **Idle:** No open turn — UI shows roll button → `POST /api/turns/roll`.
2. **Rolled:** Pending field shown; optional hints via `POST /api/turns/:id/hint`.
3. **Scan:** Camera QR → `POST /api/turns/:id/scan` (validates token vs pending field).
4. **Task:** Quiz → `answer`; performance → `awaiting_crew` until crew `rate`.
5. **Confirm:** `POST /api/turns/:id/confirm` applies score, updates position, marks field complete.
6. **Abandon:** From rolled only → zero delta, return idle.

## Error paths

- Wrong QR / field → 400 from scan service.
- Edition not live → 403 from `assertEditionLive`.
- Open turn exists → roll rejected until confirm/abandon.
