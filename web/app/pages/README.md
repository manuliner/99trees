# App pages

**Purpose:** Nuxt file-based routes for festival picker, team play, crew, admin, QR deep links, and legacy redirects.

- **index.vue** — public festival list; legacy `?edition=` redirects to slug join
- **play.vue** — main team game board (client-only, `player` layout, `TaskQrScanner`)
- **join.vue**, **rejoin.vue**, **rules.vue**, **privacy.vue**, **leaderboard.vue** — legacy redirects via `useLegacyEditionRedirect`
- **[edition]/** — canonical player routes under `/:edition/…` (see nested README)
- **admin/** — organizer login, init bootstrap, edition backoffice
- **crew/** — crew login, pending approvals hub, per-team detail
- **s/[slug].vue** — task QR → `/play?slug&t=`
- **t/[slug].vue** — team QR → edition crew login with team token
