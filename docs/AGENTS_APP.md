# Codemap — `web/app/`

Nuxt UI (English). Reflects server via `GET /api/me` — do not duplicate game rules in the client.

## Pages (by flow)

| Path | File | Purpose |
|------|------|---------|
| `/` | `pages/index.vue` | Landing / links |
| `/join` | `pages/join.vue` | Create team (edition from query) |
| `/rejoin` | `pages/rejoin.vue` | Name + PIN → session |
| `/play` | `pages/play.vue` | **Main game** — roll, hints, scan, quiz/perf, confirm |
| `/leaderboard` | `pages/leaderboard.vue` | Public ranking (poll) |
| `/rules` | `pages/rules.vue` | Static rules |
| `/privacy` | `pages/privacy.vue` | Privacy (EN) |
| `/s/:slug` | `pages/s/[slug].vue` | Station QR deep-link → scan flow |
| `/t/:slug` | `pages/t/[slug].vue` | Team QR deep-link |
| `/crew/*` | `pages/crew/` | Login, dashboard, team rate/PIN reset |
| `/admin/*` | `pages/admin/` | Init, login, edition checklist + live toggle |

## Change X → file

| Change | File |
|--------|------|
| Dice / hint / confirm UX | `pages/play.vue` |
| Join / PIN validation UI | `pages/join.vue`, `pages/rejoin.vue` |
| Score popups / colors | `composables/useScoreFeedback.ts`, `components/pixel/ScoreFlash.vue` |
| Board layout / markers | `components/pixel/BirdBoard.vue` |
| QR scanner behavior | `components/StationQrScanner.vue` |
| API calls pattern | `composables/useGameApi.ts` |
| Theme tokens / fonts | `assets/css/pixel-theme.css`, `assets/css/main.css` |
| Nuxt UI overrides | `app.config.ts` |

## Pixel components

`components/pixel/` — `PixelButton`, `PixelCard`, `PixelDialog`, `BirdBoard`, `ScoreFlash`.  
Use existing CSS variables from `pixel-theme.css`; `border-radius` minimal (0–4px).

## Data loading pattern

```ts
const { api } = useGameApi()
const { data: me, refresh } = await useFetch('/api/me', { credentials: 'include' })
// mutations: await api('/api/turns/roll', { method: 'POST' }); await refresh()
```

401 on `/api/me` → redirect `/join` (see `play.vue`).

## Deep links

- Station QR: `/s/{slug}?t={qrToken}` — `play.vue` reads query on mount for scan-after-roll.
- Team QR path comes from `me.team.teamQrPath` (server-built).

## Versioning

- Semver: `web/package.json` → `runtimeConfig.public.appVersion` (`web/nuxt.config.ts`, `resolveAppVersion()`)
- UI: `components/AppVersionFooter.vue` on `layouts/default.vue` (footer shows `vX.Y.Z`)
- Build artifact: `web/public/version.json` via `pnpm -C web version:generate` (also runs before `build`)
- Deploy check: `GET /api/health` (version, buildTime, environment)
- Releases: `.cursor/skills/release/` + root `change_notes.md` → `docs/release-notes/`

## Not in app/

- Scoring math → `web/shared/scoring.ts`
- Turn transitions → `web/server/services/game.ts`
