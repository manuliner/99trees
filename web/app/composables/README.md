# App composables

**Purpose:** Vue composables for API access, edition routing, admin UI, staff approvals, and play UX helpers.

- **useGameApi.ts** — `$fetch` wrapper with `credentials: 'include'`
- **useEditionId.ts** — resolves edition id from route slug
- **useLegacyEditionRedirect.ts** — redirects old non-slug URLs to `/[edition]/…`
- **useAdminEdition.ts** — admin edition detail fetch and mutations
- **useStaffApprovals.ts** — crew pending performance list polling
- **useTurnHints.ts** — hint timer state for active turn
- **useScoreFeedback.ts** — point delta toasts after confirm
- **useDigitPin.ts** — PIN input UX for join/rejoin
- **usePixelConfirm.ts** — promise-based confirm dialogs
- **usePullToRefresh.ts** — pull-to-refresh gesture handler

**Depends on:** `#shared` types only (never `web/server`)
