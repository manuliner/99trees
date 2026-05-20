# Play flow

**Trigger:** Authenticated, onboarded team on `/[edition]/play` polls `GET /api/me`.

## Components

`play.vue` → `useGameApi` → `api/me` → `game.buildMePayload`; `GameBoard`, `HintBar`, `MediaTaskUpload`, `TaskQrScanner`; `useOnboardingRedirect`, `useEditionTheme`, `useTurnHints`, `useLocalizedContent`

## Flow

1. **Idle:** No open turn — `POST /api/turns/roll`; board shows position, overflow (hellblau), path highlights.
2. **Rolled:** Hints via `POST …/hint`; hint 3 opens the fullscreen festival map (target pin) via **Festivalplan öffnen** in the seeking and QR-scanner modals — the inline map below the board is not reachable while those modals are open.
3. **Scan:** Task QR → `POST …/scan` — quiz, performance, coop (initiator/partner/depot), or media path.
4. **Quiz:** `POST …/answer` auto-confirms on success.
5. **Performance / media:** `awaiting_crew` until crew `rate`; media may `POST …/submission` first.
6. **Coop:** initiator `…/coop/complete` opens depot; partner completes same field; optional `POST /api/coop/link` for team-QR bonus.
7. **Confirm:** `POST …/confirm` applies score, updates position, marks field complete; goal celebration on first finish.
8. **Abandon:** From `rolled` only — zero delta, overflow restored.

## Error paths

- Wrong QR / field → 400 from scan service.
- Edition not live → 403.
- Open turn blocks new roll until confirm/abandon.
- Onboarding incomplete → redirect to `/:edition/onboarding`.

## Deep links

- **`/s/[slug]`** — task QR → play handoff.
- **`/t/[slug]`** — team QR → crew login or coop link context.
