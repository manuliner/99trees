# Project research (docs-init phase 1)

Run **before** writing any agent docs or rules. Goal: a short **Project profile** (mental or 10-line note) that drives adapted paths and commands.

## 1 — Repository shape

| Signal | Where to look | Record |
|--------|---------------|--------|
| Monorepo / workspaces | Root `package.json` `workspaces`, `pnpm-workspace.yaml`, `turbo.json` | Package roots (e.g. `web/`, `apps/api/`) |
| Single package | Root `package.json` only | `.` as app root |
| Polyglot | `go.mod`, `Cargo.toml`, `pyproject.toml`, `requirements.txt` alongside JS | Primary + secondary stacks |
| App vs library | `private`, `main`, `bin`, published name | User-facing app or reusable lib |

## 2 — Language & runtime

| Stack | Detect | Commands usually in |
|-------|--------|---------------------|
| Node / TS | `package.json`, `tsconfig.json` | `scripts` |
| Python | `pyproject.toml`, `setup.cfg` | `[tool.*]`, Makefile, README |
| Go | `go.mod` | `Makefile`, README |
| Rust | `Cargo.toml` | `cargo` |
| Java/Kotlin | `build.gradle*`, `pom.xml` | Gradle/Maven tasks |

Note: **package manager** (pnpm, npm, yarn, bun, poetry, uv) — use the one the repo actually uses (lockfile).

## 3 — Framework & boundaries

Skim top-level dirs and key deps:

| Pattern | Typical paths | Doc focus |
|---------|---------------|-----------|
| Nuxt / Next / Remix | `app/`, `pages/`, `src/app/` | Pages, API routes, server/client split |
| Express / Fastify / Hono | `server/`, `src/routes/` | Route tree, middleware |
| Django / FastAPI | `*/views`, `*/api`, `urls.py` | Apps, models, settings |
| Mobile | `ios/`, `android/`, `lib/` | Platform-specific codemap if needed |

Identify **where business logic lives** vs thin handlers — document dependency direction.

## 4 — Tooling (for AGENTS.md Commands)

Extract **exact** commands (copy from config, do not guess):

- Install: `pnpm install`, `poetry install`, …
- Dev server (+ port if documented)
- Build / typecheck / lint / test (whole suite + single-test example)
- DB migrate / seed if present
- Deploy or release script if in repo

Check: `package.json`, `Makefile`, `justfile`, `Taskfile.yml`, `README.md`, `.github/workflows/`.

## 5 — Existing agent context

| File | Action |
|------|--------|
| `AGENTS.md` / `CLAUDE.md` | Merge useful bits; do not duplicate stale content |
| `ARCHITECTURE.md`, `docs/AGENTS_*.md` | **Legacy** — migrate to `.vibe/docs/` + `web/**/README.md`, then delete |
| `web/README.md`, `.vibe/docs/` | Extend or regenerate if wrong |
| `.cursor/rules/*.mdc` | Keep user rules; add `core` + `main` if missing |
| `.cursor/skills/` | Install bundle if `docs-sync` missing |

## 6 — Security & env (for rules + gotchas)

- `.env.example` — var names only, never read real `.env`
- Secrets in client bundle? (frontend env vars)
- Auth/session pattern (cookies, JWT, API keys)
- Commit/release conventions already in repo?

## 7 — Output: project profile

Before scaffolding, confirm:

```markdown
- **Name / purpose:** (one line)
- **Roots:** e.g. repo root, or `web/` for Nuxt app
- **Stack:** e.g. Nuxt 4 + Nitro + SQLite + Drizzle
- **Commands:** install, dev, build, test, lint, db (exact strings)
- **Layer boundaries:** e.g. app/ must not import server/
- **Codemap split:** hybrid (`web/**/README.md` + `.vibe/docs/`) | legacy trilogy (migrate on init)
- **Changelog file:** change_notes.md or other
- **Existing skills to preserve:** release, custom, …
```

Use this profile for every generated path and command in layer-1/2 docs and rules.
