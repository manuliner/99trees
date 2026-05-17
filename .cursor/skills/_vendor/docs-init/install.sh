#!/usr/bin/env bash
# Install unified docs-init skill to ~/.cursor/skills/docs-init
# Templates use skill.template.md (not SKILL.md) so Cursor does not register duplicates in the repo vendor tree.
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CURSOR_SKILLS_DIR:-$HOME/.cursor/skills}/docs-init"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
mkdir -p "$DEST/reference" "$DEST/templates"

cp "$SRC/docs-init.skill.template.md" "$DEST/SKILL.md"
cp -r "$SRC/reference/." "$DEST/reference/"
cp -r "$SRC/templates/." "$DEST/templates/"

# Remove any legacy bundle/ copies of invokable skills (old install layout)
rm -rf "$DEST/bundle"

echo "Installed docs-init → $DEST"
echo "Templates (non-invokable in vendor): $DEST/templates/*/skill.template.md"
echo "Invoke in any repo: docs-init"
