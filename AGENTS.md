# AGENTS.md — 99trees (Zugvögel)

Festival field game PWA: dice, stations, QR scans, points-based highscore. Single Nuxt 4 app (`web/app` + `web/server` + `web/shared`).

## Commands (repo root)

- Dev: `pnpm dev` (0.0.0.0)
- Build: `pnpm build`
- Typecheck: `pnpm typecheck`
- DB: `pnpm db:generate` → `pnpm db:migrate` → `pnpm db:seed`

## Structure

```
web/
  app/       # Nuxt UI (English copy, 8-bit retro-hybrid)
  server/    # Nitro API, Drizzle, SQLite
  shared/    # Types, Zod, scoring (pure)
  public/
  scripts/   # seed, db-reset
```

## Invariants

- `web/app/` MUST NOT import `web/server/` — shared logic in `web/shared/`.
- Server is source of truth for game state (turns, positions, points).
- UI language: **English** only (MVP).
- N fields = N stations; game name "99" is branding, not field count.

## Docs

- Scope & flows: [`docs/SCOPE.md`](docs/SCOPE.md)
- `ARCHITECTURE.md` — boundaries
