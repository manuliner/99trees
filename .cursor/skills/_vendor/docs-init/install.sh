#!/usr/bin/env bash
# Install unified docs-init skill to ~/.cursor/skills/docs-init
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CURSOR_SKILLS_DIR:-$HOME/.cursor/skills}/docs-init"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST"
cp -r "$SRC" "$DEST"
echo "Installed docs-init → $DEST"
echo "Templates: $DEST/templates/"
echo "Invoke in any repo: docs-init"
