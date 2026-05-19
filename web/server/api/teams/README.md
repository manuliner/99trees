# Teams API

**Purpose:** Registration, session, onboarding, and public directory.

- **index.post.ts** — create team with PIN
- **rejoin.post.ts** — PIN rejoin; invalidates prior session token
- **pin.patch.ts** — change PIN when authenticated
- **onboarding.patch.ts** — avatar, motto, mark onboarding complete
- **directory.get.ts** — searchable team list for onboarding picker
- **logout.post.ts** — dev team logout
