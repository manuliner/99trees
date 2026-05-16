# Deploy & operations — 99trees (Zugvögel)

## Build & run (Docker)

```bash
docker build -t 99trees:latest .
docker run -p 3000:3000 -v 99trees-data:/data \
  -e NUXT_SESSION_PASSWORD="<32+ chars>" \
  -e NUXT_ADMIN_INIT_SECRET="<bootstrap secret>" \
  -e NUXT_CREW_SESSION_PASSWORD="<32+ chars>" \
  99trees:latest
```

- SQLite: `NUXT_SQLITE_DATABASE_PATH=/data/db.sqlite` (default in image)
- Uploaded maps: stored next to DB at `/data/uploads/editions/`
- Migrations run on container start (Nitro plugin)

## Env (production)

| Variable | Required | Notes |
|----------|----------|-------|
| `NUXT_SESSION_PASSWORD` | yes | Team/admin session encryption |
| `NUXT_ADMIN_INIT_SECRET` | yes (once) | `POST /api/admin/init` |
| `NUXT_CREW_SESSION_PASSWORD` | yes | Crew cookie signing |
| `NUXT_SQLITE_DATABASE_PATH` | optional | Default `/data/db.sqlite` |

## Health & logs

- **Health:** `GET /api/health`
- **Game events:** JSON lines on stdout (`turn.roll`, `turn.scan`, `crew.rate`) via `server/utils/logger.ts`

## Backups

Before festival or after going live:

```bash
cp /data/db.sqlite /backup/db-$(date -u +%Y%m%d).sqlite
cp -r /data/uploads /backup/uploads-$(date -u +%Y%m%d)
```

Restore: stop container, replace files, start container (migrations are idempotent).

## Rate limits (MVP)

In-memory per-IP limits in `server/middleware/rate-limit.ts` — tune before high load; use a reverse proxy for stricter limits in production.
