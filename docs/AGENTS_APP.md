---
audience: agent
category: codemap
type: Codemap
last_verified: 2026-06-19
load-when: Any player, crew, or admin UI, composable, layout, or client-side flow change.
sources:
  - web/app/
  - web/i18n/
sources_stamp: 3aa4e0cbae9a5593e2b408493471be3a56c9b404
---
# App codemap

SSOT for Nuxt pages, composables, components, and client-only utils. Runtime and invariants: [`AGENTS_ARCHITECTURE.md`](./AGENTS_ARCHITECTURE.md). API contract: [`AGENTS_SERVER.md`](./AGENTS_SERVER.md).

## Constraints

- `web/app/` MUST NOT import `web/server/`.
- Game state comes from `GET /api/me` via `useGameApi()` — no client-side scoring or turn logic beyond presentation.
- Player UI: DE default + EN (`@nuxtjs/i18n`). Admin and crew: English hardcoded.
- Task content (quiz, hints, performance copy) is bilingual edition data resolved by `useLocalizedContent`.

## Routes

### Canonical player (`/:edition/*`)

| Page | Path | Role |
| ---- | ---- | ---- |
| Edition home | `[edition]/index.vue` | Entry / redirect into join or play |
| Join | `[edition]/join.vue` | Team registration |
| Rejoin | `[edition]/rejoin.vue` | PIN rejoin |
| Onboarding | `[edition]/onboarding.vue` | Avatar + motto |
| Play | `play.vue` + edition wrapper | Board, dice, scan, tasks (shared play shell) |
| Leaderboard | `[edition]/leaderboard.vue` | Highscore |
| Rules | `[edition]/rules.vue` | Game rules |
| Privacy | `[edition]/privacy.vue` | Datenschutz |
| Impressum | `[edition]/impressum.vue` | Legal |
| Crew login | `[edition]/crew/login.vue` | Edition-scoped crew PIN |

Legacy root routes (`/join`, `/play`, `/rejoin`, …) redirect via `useLegacyEditionRedirect`.

### Admin & crew

| Page | Path | Role |
| ---- | ---- | ---- |
| Admin login | `admin/login.vue` | Organizer auth |
| Admin init | `admin/init.vue` | One-shot bootstrap |
| Admin backoffice | `admin/index.vue` | Edition CRUD, tasks, map, QR, teams |
| Crew queue | `crew/index.vue` | Approval queue (legacy path) |
| Crew team detail | `crew/teams/[id].vue` | Single-team crew view |
| Crew login (legacy) | `crew/login.vue` | Redirects to edition-scoped login |

### Deep links

| Page | Path | Role |
| ---- | ---- | ---- |
| Task QR | `s/[slug].vue` | Station deep link → active game |
| Team QR | `t/[slug].vue` | Rejoin / crew prefill |

## Composables

| Composable | Role |
| ---------- | ---- |
| `useGameApi` | `$fetch` wrapper with `credentials: 'include'` |
| `useEditionId` | Resolve edition from route |
| `useEditionTheme` | Edition branding tokens |
| `useLegacyEditionRedirect` | Root → `/:edition/*` redirects |
| `useJoinSessionGate` | Join flow session checks |
| `useOnboardingRedirect` | Gate play until onboarding complete |
| `useTurnHints` | Quiz hint UI state |
| `useScoreFeedback` | Points toast / feedback |
| `useGoalCelebration` | Goal-field celebration trigger |
| `useFestivalMapView` | Admin/player map rendering |
| `useLocalizedContent` | Bilingual task field resolution |
| `useStaffApprovals` | Crew queue polling and actions |
| `useAdminEdition` | Admin edition context |
| `usePullToRefresh` | Mobile refresh on play |
| `usePwaInstall` | PWA install prompt |
| `useDigitPin` | PIN entry UX |
| `usePixelConfirm` | Pixel-styled confirm dialogs |

## Components (by area)

| Path | Role |
| ---- | ---- |
| `components/pixel/` | Retro game UI — board, dice, map, dialogs, onboarding |
| `components/pixel/goal-celebration/` | Full-screen goal animation |
| `components/player/` | Player chrome, locale switcher |
| `components/staff/` | Crew approval UI |
| `components/admin/` | Organizer backoffice sections and modals |
| `components/TaskQrScanner.vue` | QR scan (`@zxing/browser` fallback on iOS) |
| Root `components/` | Leaderboard, legal, media upload, PWA helpers |

## Client utils & media

| Path | Role |
| ---- | ---- |
| `utils/media/` | Browser validation + `@ffmpeg/ffmpeg` transcode before upload |
| `utils/` | Errors, dice animation, form helpers |

## Layouts & i18n

| Path | Role |
| ---- | ---- |
| `layouts/player.vue` | Player shell + DE/EN switcher |
| `layouts/default.vue` | Admin / generic |
| `web/i18n/locales/` | Player UI string catalogs (`de`, `en`) |

## Styling

Pixel design tokens: `app/assets/css/pixel-theme.css`. Prefer existing `components/pixel/*` before new UI.

## Where to change what

| Task | Start here |
| ---- | ---------- |
| Team play UI | `pages/play.vue`, `components/pixel/` |
| Join / rejoin flows | `pages/[edition]/join.vue`, `rejoin.vue` |
| Onboarding | `pages/[edition]/onboarding.vue`, `useOnboardingRedirect` |
| Crew rating UI | `pages/crew/`, `components/staff/`, `useStaffApprovals` |
| Admin backoffice | `pages/admin/index.vue`, `components/admin/` |
| QR scanning | `TaskQrScanner.vue`, play page scan flow |
| Media capture/upload | `utils/media/`, submission components |
| Player copy / locale | `web/i18n/locales/`, `useLocalizedContent` |
| API calls | `useGameApi` — never raw fetch without credentials |

Per-folder one-liners: [`web/README.md`](../web/README.md) (app section).
