# Composables

**Purpose:** Shared Vue logic — API client, edition routing, play UX, admin, onboarding gates.

- **useGameApi.ts** — `$fetch` wrapper with credentials
- **useEditionId.ts** / **useEditionTheme.ts** — slug param and palette CSS application
- **useOnboardingRedirect.ts** / **useJoinSessionGate.ts** — gate play until joined/onboarded
- **useLocalizedContent.ts** — resolve bilingual task/edition strings
- **useTurnHints.ts** / **useFestivalMapView.ts** / **useGoalCelebration.ts** — play interactions
- **useAdminEdition.ts** — admin edition load/save helpers
- **useStaffApprovals.ts** — crew pending queue polling
