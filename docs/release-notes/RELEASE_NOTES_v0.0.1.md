# Release Notes - v0.0.1



## 🎉 What's New

- Player UI: German default and English via `@nuxtjs/i18n` (`web/locales/`, language switcher on join/play/rules/privacy)
- Tasks: stations renamed to tasks (DB, APIs, admin CRUD/import); bilingual task content (quiz, hints, performance) in edition data
- Play: turn score summary dialog after confirm; join session gate; localized hints and map labels
- Admin: task edit/import sections replace stations; QR export and checklist use tasks
- CI: GitHub Actions build (`manulinger/99trees`), deploy, and rollback workflows for prod/test tags

## 🐛 Bug Fixes


## 🔧 Improvements

- Seed reads `demo-tasks.json` with legacy `demo-stations.json` fallback; task i18n migration scripts for existing DBs

## 📚 Documentation

- `docs/DEPLOYMENT.md` operator runbook; `docs/DEPLOY.md` CI/hosting and SOPS env-files
- `docs/SCOPE.md`: player DE/EN UI, bilingual task import schema (`tasks` / `activity`)
- `AGENTS.md`: i18n, tasks rename, `demo-tasks.json`, deployment doc index

## ⚠️ Breaking Changes

- DB migrations `0005` / `0006`: `stations` → `tasks`, bilingual task content columns — run `pnpm db:migrate` before deploy; re-seed or re-import edition tasks

---

**Release Date**: 2026-05-18
**Version**: 0.0.1
