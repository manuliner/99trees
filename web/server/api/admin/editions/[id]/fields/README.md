# Admin board fields API

**Purpose:** Grow or shrink edition field count and shift task field numbers accordingly.

- **add.post.ts** — append a field at the end; shifts no slugs
- **remove.post.ts** — remove highest field; deletes or blocks if task occupied
