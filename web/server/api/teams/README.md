# Teams API

**Purpose:** Team registration, rejoin, PIN change, and dev logout for player sessions.

- **index.post.ts** — Creates team on live edition, sets session, returns team QR path.
- **rejoin.post.ts** — PIN rejoin invalidates prior session and returns full me payload.
- **pin.patch.ts** — Changes team PIN (optional current PIN check).
- **logout.post.ts** — Dev-only team session clear.
