# Deploy & operations — 99trees (Zugvögel)

**Production:** Docker on `pretix-server-01` via GitHub Actions + ticketing NixOS module.
Full operator runbook: [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md).

## Build & run (Docker, local)

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

## CI / hosting

| Piece | Location |
|-------|----------|
| Image build + push | `.github/workflows/build.yml` → `manulinger/99trees` |
| Deploy (SSH pull + restart) | `.github/workflows/deploy.yml` |
| Rollback | `.github/workflows/rollback.yml` |
| NixOS module | `ticketing/modules/99trees` (`zugvoegel.services.trees99`) |
| Prod / test URLs | `spiel.zugvoegelfestival.org`, `test.spiel.zugvoegelfestival.org` |

Tags `test-*` → test; `v*.*.*` → production. See release skill.

## Env (production)

| Variable | Required | Notes |
|----------|----------|-------|
| `NUXT_SESSION_PASSWORD` | yes | Team/admin session encryption |
| `NUXT_ADMIN_INIT_SECRET` | yes (once) | `POST /api/admin/init` |
| `NUXT_CREW_SESSION_PASSWORD` | yes | Crew cookie signing |
| `NUXT_SQLITE_DATABASE_PATH` | optional | Default `/data/db.sqlite` |
| `NUXT_ENVIRONMENT` | optional | `production` / `test` (health endpoint) |

Provisioned via SOPS env-files on the host (`99trees-prod-envfile`, `99trees-test-envfile`).

## Health & logs

- **Health:** `GET /api/health`
- **Game events:** JSON lines on stdout (`turn.roll`, `turn.scan`, `crew.rate`) via `server/utils/logger.ts`

## Backups

**On host** (automated): `/var/backups/99trees-{prod,test}/` via `99trees-deploy-backup` before each deploy.

**Manual** (inside container data volume):

```bash
cp /data/db.sqlite /backup/db-$(date -u +%Y%m%d).sqlite
cp -r /data/uploads /backup/uploads-$(date -u +%Y%m%d)
```

Restore: stop container, replace files under `/var/lib/99trees-<env>/data`, start container (migrations are idempotent).

## Rate limits (MVP)

In-memory per-IP limits in `server/middleware/rate-limit.ts` — tune before high load; use a reverse proxy for stricter limits in production.
