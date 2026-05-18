# Shared components

**Purpose:** Cross-cutting Vue components used by player, crew, and admin flows (not pixel design-system primitives).

- **TaskQrScanner.vue** — camera QR reader for task `/s/` and team `/t/` URLs (`@zxing/browser` fallback)
- **LeaderboardPanel.vue** — progress vs highscore tabs polling `/api/leaderboard`
- **EditionMissing.vue** — static fallback when no edition is selected
- **GameRulesContent.vue** — i18n rules paragraphs (`rules.p1`–`p4`)
- **PwaInstallDialog.vue** — add-to-home-screen sheet (player copy via i18n)
- **AppVersionFooter.vue** — `appVersion` from runtime config in layout footers
