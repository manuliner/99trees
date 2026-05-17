---
name: docs-update
description: >
  Regenerate module READMEs and .docs-trace.json under web/ (incremental or --full).
  Updates web/README.md module index. Concept docs are docs-concepts.
---

# Docs update

**Role:** Regenerate **module READMEs** from source. Does not edit `AGENTS.md` or `.vibe/docs/`.

**Boundary:** Module READMEs + traces only. Cross-module concepts → **docs-concepts**.

---

## Target

Argument: `$ARGUMENTS` (strip `--full` if present). Default root: **`web/`** (not `src/`).

- **Incremental:** Only dirs whose `.ts` / `.vue` files changed since trace commit, or dirs without a trace.
- **`--full`:** All source dirs under target + always refresh `web/README.md` index.

Monorepo note: TypeScript under `web/app`, `web/server`, `web/shared`; include `.vue` in `web/app/` when scanning.

---

## Step 1 — Identify directories

1. List dirs containing `.ts` or `.vue` under target (exclude `node_modules`, `.nuxt`, `dist`).
2. For each dir with `.docs-trace.json`, compare `git diff trace.commit..HEAD` for `*.ts` / `*.vue` in that dir.
3. Collect: **needs update**, **no trace**, or all dirs if `--full`.
4. If none need update (not full), report and stop.

---

## Step 2 — Per directory

1. `ls` dir; read each `.ts` / `.vue` (use `.test.ts` for understanding, omit from bullets).
2. **Tier:** Tier 2 if class with 2+ methods or constructor injection; else Tier 1.
3. Tier 2: `grep` consumers under `web/` for **Used by**.
4. Write `<dir>/README.md` and `<dir>/.docs-trace.json`.

**Tier 1** (~12 lines max): `# Display Name`, Purpose, one-clause bullets per file/subdir. No tables, no fenced code blocks.

**Tier 2** (~22 lines max): Purpose, optional State, class/method bullets, **Used by**, **Depends on**. Function exports: `name(params): Return`.

**Trace JSON:**

```json
{
  "commit": "<git rev-parse HEAD>",
  "createdAt": "<preserve or now ISO>",
  "updatedAt": "<now ISO>",
  "files": ["<relative paths read>"]
}
```

Use `date -u +"%Y-%m-%dT%H:%M:%SZ"` for timestamps.

---

## Step 3 — Module index

When processing multiple dirs or `--full`, write **`web/README.md`**:

```markdown
# Module Index

**Purpose:** One-line map of documented modules. Load full READMEs only for directories relevant to the current task.

- **path**: one-line from that README Purpose
```

List every documented dir under `web/` that has a `README.md`.

---

## Step 4 — Summarize

Report: skipped (up to date), updated, newly documented, index written.

Do not ask for confirmation.
