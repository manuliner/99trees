# App composables

**Purpose:** Vue composables for API access, edition routing, admin orchestration, crew approvals, and play UX.

- **useGameApi** — `api(path, options?)` wraps `$fetch` with `credentials: 'include'`
- **useEditionId** — edition id/slug from `/:edition` route or crew session; `pathWithEdition`, public edition fetch
- **useAdminEdition** — admin editions list, selected edition CRUD, tasks/teams/map, approvals, setup steps
- **usePullToRefreshProvider** / **usePullToRefresh** / **usePullToRefreshDisabled** — gesture refresh via injected handlers
- **useTurnHints** — hint unlock timers, costs, and visible hint text for active turn
- **useFestivalMapView** — pan/zoom transform state for interactive festival map
- **useStaffApprovals** — poll and rate pending crew approvals (`asAdmin` for backoffice)
- **useJoinSessionGate** — redirect existing team session to `/play` or flag cross-edition mismatch
- **useLocalizedContent** — resolve bilingual task fields for active player locale
- **useGoalCelebration** — first goal reached modal with sessionStorage dedupe
- **usePwaInstall** — beforeinstallprompt capture and role-scoped auto-show
- **useLegacyEditionRedirect** — `?edition=id` → `/:slug/…` for legacy URLs
- **useScoreFeedback**, **usePixelConfirm**, **useDigitPin** — score flash, confirm dialog, PIN input UX

**Used by:** `play.vue`, `[edition]/*`, `admin/index.vue`, `crew/*`, pixel map/pull-to-refresh, `PwaInstallDialog`

**Depends on:** `#shared` types/schemas; `useGameApi` for authenticated API calls only
