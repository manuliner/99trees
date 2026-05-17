# Design principles — 99trees

## Naming and structure

- API routes follow Nitro file convention (`*.get.ts`, `*.post.ts`) under `server/api/`.
- Domain logic lives in `server/services/*.ts`, not in handlers.
- Shared contracts: Zod in `shared/schemas.ts`, types in `shared/types.ts`.

## Error handling

- Handlers use `createError` with HTTP status; `parse-body.ts` maps Zod failures to 400.
- Services throw on illegal state transitions (wrong turn state, wrong station).
- `assertEditionLive` guards play endpoints when edition paused/ended.

## Patterns

- **Thin controller:** API file → session helper → service function.
- **Pure scoring:** All point math in `shared/scoring.ts` via `calculateTurnScore`.
- **Cookie sessions:** `team-session`, `crew-session`, `admin-session` utilities — no JWT in client storage.

## Component boundaries

- Pixel UI components under `app/components/pixel/` — presentation only.
- Composables fetch via `useGameApi()`; no direct DB access from Vue.
- Admin UI sections split under `app/components/admin/` per concern (stations, teams, edition).

## Data design

- SQLite + Drizzle; `configJson` and `completedFieldsJson` as serialized JSON columns.
- Stations keyed by `(editionId, fieldNumber)` and unique slug per edition.
- Turns store hint mode, used levels, and `scoreDelta` only on confirm.

## Quality attributes

- **Security:** httpOnly cookies, hashed PINs and session tokens, crew password per edition.
- **Maintainability:** Module READMEs under `web/` + `AGENTS.md` codemaps; run `/docs-update` after refactors.
- **Operability:** `health` endpoint, env validation plugin in production, dev-only simulate endpoints.
