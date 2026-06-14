# Deploy & operations

Production: Docker on `pretix-server-01` (`185.232.69.172`) → **https://trees.loco.vision**.
Ticketing repo owns NixOS; this repo owns app, `Dockerfile`, and GitHub Actions.

## Local Docker

```bash
docker build -t 99trees:latest .
docker run -p 3000:3000 -v 99trees-data:/data \
  -e NUXT_SESSION_PASSWORD="<32+ chars>" \
  -e NUXT_ADMIN_INIT_SECRET="<bootstrap secret>" \
  -e NUXT_CREW_SESSION_PASSWORD="<32+ chars>" \
  99trees:latest
```

- SQLite: `NUXT_SQLITE_DATABASE_PATH=/data/db.sqlite` (image default)
- Map uploads: `/data/uploads/editions/` beside DB
- Migrations on container start (Nitro plugin)

## CI / hosting

| Piece | Location |
|-------|----------|
| Image build + push | `.github/workflows/build.yml` → `manulinger/99trees` |
| Deploy (SSH pull + restart) | `.github/workflows/deploy.yml` |
| Rollback | `.github/workflows/rollback.yml` |
| NixOS module | `ticketing/modules/99trees` (`zugvoegel.services.trees99`) |

Tags `v*.*.*` → production only. Release: `bash .cursor/skills/release/scripts/release-prod.sh patch|minor|major` (pins ticketing, tags, triggers build → deploy).

## Env (production)

| Variable | Required | Notes |
|----------|----------|-------|
| `NUXT_SESSION_PASSWORD` | yes | Team/admin session encryption |
| `NUXT_ADMIN_INIT_SECRET` | yes (once) | `POST /api/admin/init` |
| `NUXT_CREW_SESSION_PASSWORD` | yes | Crew cookie signing |
| `NUXT_SQLITE_DATABASE_PATH` | optional | Default `/data/db.sqlite` |
| `NUXT_ENVIRONMENT` | optional | `production` / `test` (health) |

SOPS env-file on host: `99trees-prod-envfile`.

## One-time setup

**GitHub secrets (this repo):** `DOCKER_USERNAME`, `DOCKER_PASSWORD`, `SSH_PRIVATE_KEY`, `SSH_KNOWN_HOSTS` (`ssh-keyscan -H 185.232.69.172`).

**Host (ticketing repo):** deploy pubkey in `zugvoegel.services.trees99.deployAuthorizedKeys`; SOPS secrets; DNS `trees.loco.vision` → server; `cd ../ticketing && ./deploy.sh`.

## Release flow

1. `release-prod.sh` bumps version, pins `manulinger/99trees:<semver>` in ticketing (`TICKETING_REPO`, default `../ticketing`), tags `vX.Y.Z`.
2. `build.yml` pushes image; `deploy.yml` SSH backup → pull immutable tag → restart `99trees-prod-container.service` → health check.

Host/module changes: edit ticketing `modules/99trees` / `environments/99trees-prod.nix`, then `./deploy.sh` in ticketing — not from app CI.

## Health & logs

**systemd unit (production):** `99trees-prod-container.service` — use in Loki queries: `{unit="99trees-prod-container.service"}`.

- `GET /api/health` → `{ "status": "ok" }` when SQLite is reachable (prod omits version); `503` + `{ "status": "unhealthy" }` when DB check fails
- `GET /version.json` → `{ "version", "buildTime" }`
- Game events: JSON stdout (`turn.roll`, `turn.scan`, `crew.rate`) via `web/server/utils/logger.ts`
- Operational logs: JSON lines with `timestamp`, `level`, `message` via `web/server/utils/log.ts` (journal → hub Loki on `pretix-server-01`)
- No direct Loki push from the app

## Metrics

- `GET /api/metrics` — Prometheus text exposition; gated by `NUXT_METRICS_ENABLED=true`
- Host Alloy scrapes `127.0.0.1:3323/api/metrics` (prod host port maps to container `:3000`); not intended for public nginx
- Optional `NUXT_METRICS_TOKEN` for non-localhost scrapes; localhost/private IPs allowed without token
- HTTP aggregates only (`trees99_http_*`); route labels normalized (no team/user IDs)

## Backups & rollback

- **Auto:** `/var/backups/99trees-prod/` before each deploy (`99trees-deploy-backup`)
- **Manual:** copy `/data/db.sqlite` and `/data/uploads` from data volume; restore with unit stopped (migrations idempotent)
- **Image rollback:** GitHub Actions → *Rollback Docker image* → production + immutable tag (e.g. `1.0.2`)

## Troubleshooting

```bash
systemctl status 99trees-prod-container.service
journalctl -u 99trees-prod-container.service -f
curl -sf https://trees.loco.vision/api/health | jq .
curl -sf http://127.0.0.1:3323/api/metrics   # on pretix-server-01, requires NUXT_METRICS_ENABLED=true
```

Ticketing overview: [`ticketing/docs/deploy-overview.md`](https://github.com/zugvoegel-festival/ticketing/blob/main/docs/deploy-overview.md).

## Rate limits

In-memory per-IP in `web/server/middleware/rate-limit.ts` — tune before high load; use reverse proxy for stricter prod limits.
