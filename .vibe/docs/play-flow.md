# Play flow

**Trigger:** Authenticated team on `/[edition]/play` polls `GET /api/me`.

## Components

`play.vue` → `useGameApi` → `api/me` → `game.buildMePayload` → SQLite; pixel `GameBoard`, `HintBar`, `FestivalMap*`; `useTurnHints`, `useFestivalMapView`

## Flow

1. **Idle:** No open turn — roll → `POST /api/turns/roll`; board shows confirmed position via `GameBoard`.
2. **Rolled:** Pending field on board; hints → `POST /api/turns/:id/hint` (costs may apply immediately); tips UI via `HintBar` / `PixelTooltip`.
3. **Map (optional):** Edition map image — inline preview with expand → fullscreen pan/zoom; hint level 3 can show target pin on map.
4. **Scan:** QR → `POST /api/turns/:id/scan` (token must match pending field).
5. **Task:** Quiz → `answer`; performance → `awaiting_crew` until crew `rate`.
6. **Confirm:** `POST /api/turns/:id/confirm` applies `calculateTurnScore`, updates position, marks field complete.
7. **Abandon:** From `rolled` only → zero delta, return idle.

## Error paths

- Wrong QR / field → 400 from scan service.
- Edition not live → 403 from `assertEditionLive`.
- Open turn exists → roll rejected until confirm/abandon.
