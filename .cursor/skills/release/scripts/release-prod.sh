#!/usr/bin/env bash
#
# Production Release Script
#
# Creates a production release with version bump and release notes conversion.
# - Requires clean git, master/main branch
# - Bumps version (patch/minor/major)
# - Converts change_notes.md → docs/release-notes/RELEASE_NOTES_v*.md
# - Creates tag v*.*.* and pushes
#
# Usage:
#   bash release-prod.sh patch
#   bash release-prod.sh minor
#   bash release-prod.sh major
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/release-common.sh"

init_release_env
CHANGE_NOTES="$ROOT/change_notes.md"
RELEASE_NOTES_DIR="$ROOT/docs/release-notes"

# Prompt for version type
prompt_version_type() {
  local current="$1"
  local patch_ver minor_ver major_ver
  patch_ver=$(bump_version patch "$current")
  minor_ver=$(bump_version minor "$current")
  major_ver=$(bump_version major "$current")
  echo "" >&2
  log "Current version $current is already deployed." "$YELLOW"
  log "Choose version bump:" "$BLUE"
  echo "  1) patch  → $current → $patch_ver"
  echo "  2) minor  → $current → $minor_ver"
  echo "  3) major  → $current → $major_ver"
  echo ""
  read -r -p "Enter choice (1-3 or patch/minor/major): " answer
  answer=$(echo "$answer" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
  case "$answer" in
    1|patch) echo "patch" ;;
    2|minor) echo "minor" ;;
    3|major) echo "major" ;;
    *) log "❌ Invalid choice." "$RED"; exit 1 ;;
  esac
}

# Extract content from change_notes.md (between header and ---)
extract_change_notes_content() {
  awk '
    /^# Change Notes/ { in_section=1; next }
    in_section && /^---/ { exit }
    in_section && /^[[:space:]]*<!--/ { next }
    in_section { print }
  ' "$CHANGE_NOTES"
}

# Create change notes template
create_change_notes_template() {
  cat << 'TEMPLATE'
# Change Notes

<!-- Collect changes here during development -->
<!-- This file will be converted to RELEASE_NOTES_v*.md during production release -->

## 🎉 What's New

<!-- Add new features here -->

## 🐛 Bug Fixes

<!-- Add bug fixes here -->

## 🔧 Improvements

<!-- Add improvements here -->

## 📚 Documentation

<!-- Add documentation changes here -->

## ⚠️ Breaking Changes

<!-- Add breaking changes here (if any) -->

---
*This file is automatically converted to release notes during production release.*
TEMPLATE
}

# Check if change notes have real content (not just template)
has_change_content() {
  grep -v '^[[:space:]]*#' "$CHANGE_NOTES" 2>/dev/null | \
  grep -v '^[[:space:]]*<!--' | \
  grep -v '^[[:space:]]*---' | \
  grep -v '^[[:space:]]*\*' | \
  grep -q '[^[:space:]]' && return 0 || return 1
}

show_help() {
  echo ""
  log "Production Release Script" "$BLUE"
  echo ""
  log "Usage:" "$GREEN"
  echo "  bash release-prod.sh patch   # 2.5.9 → 2.6.0"
  echo "  bash release-prod.sh minor   # 2.5.9 → 2.7.0"
  echo "  bash release-prod.sh major   # 2.5.9 → 3.0.0"
  echo ""
  log "Requirements: master/main branch, clean git, change_notes.md with content" "$GREEN"
  echo ""
}

# Parse args
if [[ "$1" == "--help" || "$1" == "-h" || "$1" == "help" ]]; then
  show_help
  exit 0
fi

VERSION_TYPE="$1"

# 1. Check git status
log "🔍 Checking git status..."
assert_clean_git true
echo ""

# 2. Check branch
assert_branch "master main"
BRANCH=$(git branch --show-current)
log "📍 Current branch: $BRANCH"
echo ""

# 3. Get version
CURRENT_VERSION=$(get_version)
log "📦 Current version: $CURRENT_VERSION"

# 4. Run release test gate before changing release notes, versions, commits or tags
run_release_test_suite "$ROOT"

# 5. Determine version type (prompt if current already deployed)
log "🔍 Checking if current version is already deployed..."
if tag_exists_on_origin "$CURRENT_VERSION"; then
  log "ℹ️  Tag v$CURRENT_VERSION exists on origin" "$YELLOW"
  if [[ -z "$VERSION_TYPE" || "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
    VERSION_TYPE=$(prompt_version_type "$CURRENT_VERSION")
  fi
else
  log "ℹ️  No tag for v$CURRENT_VERSION on origin" "$BLUE"
  if [[ -z "$VERSION_TYPE" || "$VERSION_TYPE" != "patch" && "$VERSION_TYPE" != "minor" && "$VERSION_TYPE" != "major" ]]; then
    log "❌ Usage: bash release-prod.sh <patch|minor|major>" "$RED"
    exit 1
  fi
fi

NEW_VERSION=$(bump_version "$VERSION_TYPE" "$CURRENT_VERSION")
log "🚀 Starting production release ($VERSION_TYPE)..."
log "📦 New version: $NEW_VERSION"
echo ""

# 6. Check change_notes.md
if [[ ! -f "$CHANGE_NOTES" ]]; then
  log "⚠️  change_notes.md not found. Creating template..." "$YELLOW"
  create_change_notes_template > "$CHANGE_NOTES"
  log "✅ Created $CHANGE_NOTES. Add content and run again." "$GREEN"
  exit 1
fi

if ! has_change_content; then
  log "⚠️  change_notes.md is empty or only template" "$YELLOW"
  log "Please add changes before production release." "$YELLOW"
  exit 1
fi

# 7. Convert change notes to release notes
log "📝 Converting change notes to release notes..."
mkdir -p "$RELEASE_NOTES_DIR"
CONTENT=$(extract_change_notes_content)
RELEASE_DATE=$(date +%Y-%m-%d)
RELEASE_NOTES_FILE="$RELEASE_NOTES_DIR/RELEASE_NOTES_v${NEW_VERSION}.md"

cat > "$RELEASE_NOTES_FILE" << EOF
# Release Notes - v${NEW_VERSION}

${CONTENT:-<!-- No changes documented yet -->}

---

**Release Date**: ${RELEASE_DATE}
**Version**: ${NEW_VERSION}
EOF

log "✅ Created $RELEASE_NOTES_FILE" "$GREEN"

# 8. Create new change notes template
log "📝 Creating new change notes template..."
create_change_notes_template > "$CHANGE_NOTES"
log "✅ Reset $CHANGE_NOTES" "$GREEN"

# 9. Bump version in web/package.json
log "📦 Bumping version in web/package.json..."
(cd "$APP_ROOT" && npm version "$VERSION_TYPE" --no-git-tag-version >/dev/null 2>&1)
log "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION" "$GREEN"

# 10. Pin immutable image in ticketing repo (pretix-server-01 Nix + CI deploy)
log "📌 Pinning 99trees prod image in ticketing..."
update_ticketing_99trees_pin "$NEW_VERSION"
echo ""

# 11. Add files and commit
log "📦 Adding files..."
git add web/package.json "$RELEASE_NOTES_FILE" "$CHANGE_NOTES"
[[ -f package-lock.json ]] && git add package-lock.json
[[ -f pnpm-lock.yaml ]] && git add pnpm-lock.yaml

log "💾 Creating commit..."
git commit -m "Release v${NEW_VERSION}"
log "✅ Commit created" "$GREEN"

# 12. Push and tag
log "🚀 Pushing changes..."
git push

TAG_NAME="v${NEW_VERSION}"
create_and_push_tag "$TAG_NAME"

echo ""
echo "============================================================"
log "🎉 Production release completed successfully!" "$GREEN"
echo "============================================================"
log "📦 Version: $CURRENT_VERSION → $NEW_VERSION" "$BLUE"
log "🏷️  Tag: $TAG_NAME" "$BLUE"
log "💡 GitHub Actions will build and deploy to production" "$BLUE"
echo ""
