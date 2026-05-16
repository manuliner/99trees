# Doc index — where agents should look

| Question | Read first |
|----------|------------|
| Commands, env, repo invariants | [`AGENTS.md`](../AGENTS.md) |
| Layers, API list, turn states | [`ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Page/component changes | [`AGENTS_APP.md`](AGENTS_APP.md) |
| Endpoints, DB, game rules | [`AGENTS_SERVER.md`](AGENTS_SERVER.md) |
| Product rules, UX copy, flows (German) | [`SCOPE.md`](SCOPE.md) |
| Implementation vs SCOPE checklist | [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md) |
| Deploy, backups, env | [`DEPLOY.md`](DEPLOY.md) |
| Commit/security rules | [`.cursor/rules/core.mdc`](../.cursor/rules/core.mdc) |
| Web-only UI rules | [`.cursor/rules/web.mdc`](../.cursor/rules/web.mdc) |

**Verify docs present:** `bash .cursor/skills/docs-bootstrap/scripts/verify-docs.sh` (repo root).

**After large refactors:** run docs-bootstrap or docs-writer audit; keep codemaps aligned with `web/server/api/` file list.
