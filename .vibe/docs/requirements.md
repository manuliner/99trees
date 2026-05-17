# Requirements — 99trees

## Functional

- **REQ-001:** WHEN a team is authenticated THEN the system SHALL expose edition, open turn, and board state via `GET /api/me`.
- **REQ-002:** WHEN a team rolls dice THEN the system SHALL compute pending position skipping completed fields.
- **REQ-003:** WHEN a team scans a valid station QR for the pending field THEN the system SHALL transition the turn to `scanned` and attach the station.
- **REQ-004:** WHEN performance is crew-rated THEN the system SHALL allow confirm and apply `calculateTurnScore`.
- **REQ-005:** WHEN a team abandons from `rolled` THEN the system SHALL record zero score delta and leave `position_confirmed` unchanged.
- **REQ-006:** WHEN edition status is not `live` THEN the system SHALL reject team play mutations.
- **REQ-007:** WHEN admin imports stations THEN the system SHALL merge by slug and preserve QR tokens on update.
- **REQ-008:** WHEN a team rejoins with PIN THEN the system SHALL invalidate the prior session token.
- **REQ-009:** WHEN hints are configured and claimed THEN the system SHALL deduct points per edition rules and expose revealed hint content to the client.
- **REQ-010:** WHEN an edition has a festival map image THEN the play UI SHALL show map pins for visited/target fields and allow fullscreen inspection.

## Non-functional

- **REQ-NF-001:** Secrets SHALL remain server-only via Nuxt `runtimeConfig`.
- **REQ-NF-002:** Leaderboard SHALL use `position_confirmed` only, not pending mid-turn position.
- **REQ-NF-003:** UI copy SHALL be English for MVP; product spec may remain German in `docs/SCOPE.md`.
