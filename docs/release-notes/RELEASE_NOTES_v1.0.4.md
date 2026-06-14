# Release Notes - v1.0.4



## 🎉 What's New

- Prometheus metrics endpoint (`GET /api/metrics`) with optional bearer token; host Alloy scrapes on localhost
- Structured JSON operational logs via `web/server/utils/log.ts` (journal → Loki)

## 🐛 Bug Fixes

- Fix mobile scroll hang in Vogelauswahl and Spielbrett: nested `overflow-y` cards no longer trigger pull-to-refresh or overscroll chaining
- Health check returns `503` when SQLite is unreachable

## 🔧 Improvements

- Pull-to-refresh ignores touches inside scrollable card containers
- `.scroll-contained` utility (`overscroll-behavior-y: contain`) on avatar picker, game board, dialogs, and team directory list
- Unit tests for nested-scroll PTR detection

## 📚 Documentation

- Update `docs/DEPLOY.md` for metrics, logging, health check, and systemd unit name

## ⚠️ Breaking Changes

---

**Release Date**: 2026-06-14
**Version**: 1.0.4
