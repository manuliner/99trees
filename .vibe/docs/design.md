# Design principles — 99trees

## Naming and structure

- API routes follow Nitro file convention under `server/api/`.
- Domain logic in `server/services/*.ts`, not handlers.
- Contracts: Zod in `shared/schemas.ts`, types in `shared/types.ts`.
- Board geometry: `shared/game-board-layout.ts` (`computeGameBoardLayout`, orthogonal path).
- Tasks (not stations): DB table `tasks`, admin API under `…/tasks`, QR slugs via `task-slug.ts`.

## Error handling

- Handlers use `createError` with HTTP status; Zod failures → 400.
- Services throw on illegal turn transitions or wrong task/field.
- `assertEditionLive` guards play mutations when edition paused/ended.

## Patterns

- **Thin controller:** API → session helper → service.
- **Pure scoring:** `shared/scoring.ts` / `calculateTurnScore` only.
- **Cookie sessions:** team, crew, admin, staff utilities — no JWT in client storage.
- **Play UI:** Composables fetch; pixel components render; `useFestivalMapView` owns map pan/zoom; `useLocalizedContent` resolves task text.
- **Player i18n:** `web/i18n/locales/*.json` for chrome; edition task payloads store `{ de, en }` per field.

## Component boundaries

- **pixel/** — presentation: `GameBoard`, festival map stack, hints, dialogs, goal celebration.
- **admin/** — organizer sections; data via `useAdminEdition`.
- **player/** — language switcher only; wired through `player` layout.
- **layouts/** — `player`, `default`, `crew`, `admin` shells; no server imports.
- Pages orchestrate composables + pixel; no duplicated game rules.

## Data design

- SQLite + Drizzle; `configJson`, `completedFieldsJson` as JSON columns.
- Tasks: `(editionId, fieldNumber)` + unique slug per edition; bilingual hint/activity columns.
- Map assets on disk, served under `api/uploads/editions`.
- Turns store hint usage; score delta on confirm only.

## Quality attributes

- **Security:** httpOnly cookies, hashed PINs/tokens, per-edition crew password.
- **Maintainability:** Module READMEs under `web/` + `AGENTS.md`; `/docs-update` after refactors.
- **Operability:** health endpoint, env validation plugin, dev simulate endpoints.
