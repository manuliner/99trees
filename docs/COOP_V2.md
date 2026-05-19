# Co-op Model B (async depot)

Festival teams open a **depot** on a field after completing initiator instructions. Another team joins as **partner**, earns base points, then both teams can claim a configurable **bonus** by scanning each other's team QR.

## Task type `coop`

```json
{
  "type": "coop",
  "instructions": { "de": "…", "en": "…" },
  "partnerInstructions": { "de": "…", "en": "…" }
}
```

## Flow

1. **Initiator:** roll → scan station → instructions → `POST /api/turns/:id/coop/complete` → base score + `coop_depots` row (`awaiting_partner`).
2. **Partner:** roll → scan same field (depot exists) → partner instructions → complete → `awaiting_coop` → optional `POST …/coop/continue-playing` → background + bonus banner.
3. **Bonus:** `POST /api/coop/link` with partner team QR (`partnerSlug`, `token`) — credits both teams via `coopBonusPoints` in edition config (default 25).

## API

| Endpoint | Purpose |
|----------|---------|
| `POST /api/turns/:id/scan` | Co-op branch: initiator vs partner |
| `POST /api/turns/:id/coop/complete` | Finish initiator or partner station part |
| `POST /api/turns/:id/coop/continue-playing` | Defer partner wait (like performance) |
| `POST /api/coop/link` | Team QR bonus |
| `GET /api/me` | `pendingCoopItems`, `openTurn.coopRole` |

## DB

Migration **`0011_coop_depots.sql`** — table `coop_depots`, unique open depot per `(edition_id, field_number)` while `state = awaiting_partner`.

Turn states: `awaiting_coop`, `awaiting_coop_bg` (mirror performance crew wait).
