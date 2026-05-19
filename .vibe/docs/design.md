# Design principles — 99trees

## Naming and structure

- API routes: Nitro files under `server/api/`; coop under `turns/[id]/coop` and `coop/link`.
- Domain logic in `server/services/*.ts`; media bytes in `server/services/media-submission.ts`.
- Contracts: Zod in `shared/schemas.ts`; activity payloads in `shared/quiz-payload.ts`.
- Board: `shared/game-board-layout.ts` + `shared/board-overflow.ts` for hellblau overflow tiles.

## Error handling

- Handlers: `createError` + Zod → 400; services throw on illegal transitions.
- `assertEditionLive` on play mutations; CSRF middleware on state-changing API calls.

## Patterns

- **Thin controller:** API → session → service.
- **Pure scoring:** `shared/scoring.ts` including `coopLinkBonusPoints`.
- **Cookie sessions:** team, crew (signed edition token), admin — no client JWT storage.
- **Media pipeline:** client `app/utils/media` transcode → `POST …/submission` → crew `content.get`.
- **Themes:** `shared/pixel-palettes` + `useEditionTheme` set CSS variables on player layout.

## Component boundaries

- **pixel/** — board, map, dice, onboarding pickers, dialogs (no game rules).
- **admin/** — edition sections via `useAdminEdition`.
- **staff/** — crew approval cards for performance and media.
- Pages wire composables; rules live in services + shared only.

## Data design

- SQLite: `coop_depots`, `turn_submissions`, team `overflow_fields_json`, `avatar_id`, join hero columns.
- Uploads on disk under `server/database/uploads/` (maps, join logos, submissions).
- Activity types stored on `tasks.activity_type` with JSON payload per type.

## Quality attributes

- **Security:** httpOnly cookies, hashed PINs, CSRF origin check, upload size route rule.
- **Maintainability:** module READMEs under `web/`; concept docs in `.vibe/docs/`.
- **Operability:** health endpoint, env validation, dev roll/simulate shortcuts.
