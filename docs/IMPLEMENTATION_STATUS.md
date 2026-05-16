# Implementation vs SCOPE — status

Living checklist against [`SCOPE.md`](SCOPE.md). Last aligned with MVP fixes (B1/B2, hints, admin, PWA, ops).

## Legend

| Symbol | Meaning |
|--------|---------|
| Done | MVP acceptance met |
| Partial | Core works; gaps remain |
| Missing | Not built |
| Fixed | Was broken; addressed |

## Critical fixes

| ID | Item | Status |
|----|------|--------|
| B1 | Multi-turn play after confirm | **Fixed** — `getOpenTurn()` ignores `confirmedAt` |
| B2 | 0-round from `awaiting_crew` | **Fixed** — `abandon.post.ts` allows performance wait |

## F1–F14 (summary)

| ID | Status | Notes |
|----|--------|-------|
| F1 | Partial | Join/rejoin/crew PIN reset; no team size UI, rejoin rate limit |
| F2 | Partial | `BirdBoard` strip; not full pixel-art map |
| F3 | Done | Roll + skip fields; B1 fixed |
| F4 | Partial | Hints 1–3 + map UI; timers for 2/3 |
| F5 | Partial | In-app + deep-link scan |
| F6 | Done | Quiz |
| F7 | Partial | Performance + crew; timeout auto-complete |
| F8 | Partial | Crew search, rate, PIN reset, **team QR scan**, logout |
| F9 | Partial | Hint 3 map pin; immediate hint deduct on use |
| F10 | Done | Confirm + 0-round |
| F11 | Partial | Leaderboard poll, draft/paused, winner, mini board, O10 fallback |
| F12 | Partial | Manifest + SW shell cache + install hint |
| F13 | Partial | Admin create/import/map/QR export/live/pause/end |
| F14 | Partial | Health, JSON logs, rate limits, this deploy doc |

## Out of scope (V1/V2)

WebSocket leaderboard, offline sync, GPS anti-cheat, i18n, team-vs-team QR — intentionally absent.
