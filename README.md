# 99trees — Zugvögel field game

Nuxt 4 PWA for the Zugvögel festival ground game.

## Setup

```bash
pnpm install
cp .env.example web/.env
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open http://localhost:3000/zv26/join — demo edition is seeded as `live` (slug `zv26`).

- **Crew:** `/zv26/crew/login` (password from seed: `crew1234`)
- **Admin:** `/admin/init` then `/admin/login` (init secret from `.env`)
- **Scope:** [`docs/SCOPE.md`](docs/SCOPE.md)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server |
| `pnpm db:seed` | Demo stations + live edition |
| `pnpm db:reset` | Delete DB and re-migrate |
