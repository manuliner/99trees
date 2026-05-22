# Deployment

Operator runbook for shipping 99trees to `pretix-server-01` (`185.232.69.172`).
Production only — canonical host **https://trees.loco.vision**.

## Architecture

The **ticketing** repo owns NixOS (`environments/99trees-prod.nix`, module, secrets,
host rebuilds). This repo owns the app, [`web/Dockerfile`](web/Dockerfile), and
GitHub Actions (build, deploy, rollback). App releases do **not** run
`nixos-rebuild` from CI.

Release scripts pin `manulinger/99trees:<semver>` in ticketing (`TICKETING_REPO`,
default `../ticketing`) before tagging here.

## One-time setup

### GitHub Actions secrets (99trees repo)

| Secret | Description |
|--------|-------------|
| `DOCKER_USERNAME` / `DOCKER_PASSWORD` | Docker Hub push for `manulinger/99trees` |
| `SSH_PRIVATE_KEY` | Deploy key (`ssh-keygen -t ed25519 -C "github-actions-99trees"`) |
| `SSH_HOST` | (Optional) default `185.232.69.172` |
| `SSH_KNOWN_HOSTS` | **Required** — `ssh-keyscan -H 185.232.69.172` |

### Host (ticketing repo)

1. Pubkey in `zugvoegel.services.trees99.deployAuthorizedKeys` in
   [`ticketing/configuration.nix`](https://github.com/zugvoegel-festival/ticketing/blob/main/configuration.nix).
2. SOPS `99trees-prod-envfile` — see [`ticketing/secrets/README.md`](https://github.com/zugvoegel-festival/ticketing/blob/main/secrets/README.md).
3. DNS: `trees.loco.vision` → A record to `185.232.69.172`.
4. Activate: `cd ../ticketing && ./deploy.sh`

## Day-to-day

### Production release

```bash
bash .cursor/skills/release/scripts/release-prod.sh patch   # or minor / major
```

Pins ticketing → bumps `web/package.json` → tag `vX.Y.Z` → `build.yml` →
`deploy.yml` (SSH backup, pull immutable tag, restart `docker-99trees-prod.service`,
health check on `https://trees.loco.vision/api/health`).

### Host / module changes

Edit ticketing `modules/99trees` / `environments/99trees-prod.nix`, then:

```bash
cd ../ticketing && ./deploy.sh
```

## Rollbacks

**GitHub:** Actions → *Rollback Docker image* → `production` → immutable tag
(e.g. `1.0.2`). Re-tags `prod-latest`, pulls on host, restarts prod unit.

**Data:** `/var/backups/99trees-prod/` — stop unit, extract tarball, start unit.

## Troubleshooting

- `systemctl status docker-99trees-prod.service`
- `journalctl -u docker-99trees-prod.service -f`
- `curl -sf https://trees.loco.vision/api/health | jq .`

See also [`ticketing/docs/deploy-overview.md`](https://github.com/zugvoegel-festival/ticketing/blob/main/docs/deploy-overview.md).
