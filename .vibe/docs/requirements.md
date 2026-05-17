# Requirements — 99trees

## Functional

- **REQ-001:** WHEN a team is authenticated THEN the system SHALL expose current edition, open turn, and board state via `GET /api/me`.
- **REQ-002:** WHEN a team rolls dice THEN the system SHALL compute pending position skipping already completed fields.
- **REQ-003:** WHEN a team scans a valid station QR for the pending field THEN the system SHALL transition the turn to `scanned` and attach the station.
- **REQ-004:** WHEN a performance task completes crew rating THEN the system SHALL allow turn confirm and apply `calculateTurnScore`.
- **REQ-005:** WHEN a team abandons from `rolled` THEN the system SHALL record zero score delta and leave `position_confirmed` unchanged.
- **REQ-006:** WHEN edition status is not `live` THEN the system SHALL reject team play mutations.
- **REQ-007:** WHEN admin imports stations THEN the system SHALL merge by slug and preserve existing QR tokens on update.
- **REQ-008:** WHEN a team rejoins with PIN THEN the system SHALL invalidate the previous session token (single active device).

## Non-functional

- **REQ-NF-001:** Secrets (session passwords, admin init) SHALL remain server-only via Nuxt `runtimeConfig`.
- **REQ-NF-002:** Leaderboard SHALL rank teams by `position_confirmed` only, not mid-turn pending position.
- **REQ-NF-003:** UI copy SHALL be English for MVP; product spec may remain German in `docs/SCOPE.md`.
