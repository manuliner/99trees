# Requirements — 99trees

## Functional

- **REQ-001:** WHEN a team is authenticated THEN the system SHALL expose edition, open turn, coop items, and board state via `GET /api/me`.
- **REQ-002:** WHEN a team rolls dice THEN the system SHALL compute pending position skipping completed fields and record path overflow fields.
- **REQ-003:** WHEN a team scans a valid task QR for the pending field THEN the system SHALL branch by activity type (`quiz`, `performance`, `coop`, `media`).
- **REQ-004:** WHEN performance or media is crew-rated THEN the system SHALL allow confirm and apply `calculateTurnScore`.
- **REQ-005:** WHEN a team abandons from `rolled` THEN the system SHALL record zero score delta and restore pre-roll overflow fields.
- **REQ-006:** WHEN edition status is not `live` THEN the system SHALL reject team play mutations.
- **REQ-007:** WHEN admin imports tasks THEN the system SHALL merge by slug and preserve QR tokens on update.
- **REQ-008:** WHEN a team rejoins with PIN THEN the system SHALL invalidate the prior session token.
- **REQ-009:** WHEN hints are claimed THEN the system SHALL deduct points per edition rules and expose localized hint content.
- **REQ-010:** WHEN coop initiator completes a station THEN the system SHALL open a depot until a partner completes or bonus is linked.
- **REQ-011:** WHEN a media task is submitted THEN the system SHALL store the file and queue crew approval before confirm.
- **REQ-012:** WHEN onboarding is incomplete THEN the system SHALL redirect teams to onboarding before play.
- **REQ-013:** WHEN a player switches locale THEN UI chrome SHALL be DE or EN; task content SHALL resolve bilingual edition fields.

## Non-functional

- **REQ-NF-001:** Secrets SHALL remain server-only via Nuxt `runtimeConfig`.
- **REQ-NF-002:** Leaderboard SHALL use `position_confirmed` only.
- **REQ-NF-003:** Admin and crew UI SHALL stay English; player flows SHALL support DE default and EN.
