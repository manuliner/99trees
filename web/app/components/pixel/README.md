# Pixel UI components

**Purpose:** Retro/pixel design system — buttons, dialogs, board, dice, hints. Use CSS variables from `assets/css/pixel-theme.css` (minimal border-radius).

- **PixelButton.vue**, **PixelIconButton.vue**, **PixelDiceButton.vue** — primary actions
- **PixelDialog.vue**, **PixelConfirmDialog.vue**, **PixelConfirmHost.vue** — modals and confirm API
- **GameBoard.vue** — field board visualization (markers, position)
- **FestivalMap.vue** — edition map overlay
- **ScoreFlash.vue** — point delta animation
- **HintBar.vue**, **PixelHintIcon.vue**, **PixelTooltip.vue** — turn hints UX
- **PixelPullToRefresh.vue**, **PixelPullToRefreshClient.client.vue** — mobile refresh
- **PixelBadgeDigit.vue** — numeric badge display

**Used by:** `app/pages/play.vue`, admin components, crew flows

**Depends on:** `pixel-theme.css`, composables `usePixelConfirm`, `usePullToRefresh`
