---
audience: agents
category: release-notes
last_verified: 2026-05-18
load-when: Reviewing changelog or release history for a specific version.
---
# Release Notes - v0.0.3



## 🎉 What's New

- Animated dice roll and token move on the play board, with a full-screen roll overlay and “seeking station” dialog
- Goal celebration rain when a team reaches the final field (classic or Wanderkarten style)
- Board path highlights: played fields (green) and overflow/skipped fields (light blue), persisted per turn and team

## 🐛 Bug Fixes


## 🔧 Improvements

- `POST /api/teams/logout` and dev menu logout for clearing team session during testing
- Vitest + `boardFieldsBetween` unit tests; root `pnpm test` script
- Pull-to-refresh disabled while roll animation, celebration, or seeking modal is open

## 📚 Documentation


## ⚠️ Breaking Changes

- DB migrations `0007_turn_path_highlights` and `0008_team_overflow_fields` (additive columns; run migrate on deploy)

---

**Release Date**: 2026-05-18
**Version**: 0.0.3
