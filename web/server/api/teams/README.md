# Teams API

**Purpose:** Team registration, rejoin, and PIN updates (team session cookie).

- **index.post.ts** — create team for edition (name, PIN, size)
- **rejoin.post.ts** — rejoin with PIN; invalidates prior session token
- **pin.patch.ts** — change team PIN when authenticated
