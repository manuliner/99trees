# Agent context files

## Purpose

Align automated agents (Cursor, Claude Code) on **one** profile and **five** skills.

## Typical paths

| Path | Role |
| ---- | ---- |
| `.cursor/agent-profile.json` | `autoSections`, `documentation.*` paths for verify scripts |
| `.cursor/skills/*` | Canonical five skills only |
| `.cursor/rules/*.mdc` | Optional always-apply or glob-scoped rules |

## L0 scan

Parent agent resolves repo root, runs `detect-harness.sh`, reads profile if present, then loads harness MOC (L0) or repo MOC (L1) before deep files.

L1 service repos set `harnessPath` in `.cursor/agent-profile.json` pointing at the sibling harness (e.g. `../platform-harness`).
