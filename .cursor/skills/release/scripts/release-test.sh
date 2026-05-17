#!/usr/bin/env bash
#
# Test Release Script
#
# Creates a test release with current version and incrementing build number, or uses a custom tag.
# - If no tag provided: Keeps version from package.json, increments build number
# - If tag provided: Uses the provided tag name directly
# - Creates test tag and pushes to trigger GitHub Actions
#
# Usage:
#   bash release-test.sh              # Uses version + build number
#   bash release-test.sh test-feature-x   # Custom tag
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/release-common.sh"

init_release_env
BUILD_NUMBER_FILE="$ROOT/.build-number"

show_help() {
  echo ""
  log "Test Release Script" "$BLUE"
  echo ""
  log "Usage:" "$GREEN"
  echo "  bash release-test.sh              # Version + build number"
  echo "  bash release-test.sh <tag-name>   # Custom tag (e.g. test-feature-x)"
  echo ""
  log "Options:" "$GREEN"
  echo "  --help, -h    Show this help"
  echo ""
}

# Parse args
if [[ "$1" == "--help" || "$1" == "-h" || "$1" == "help" ]]; then
  show_help
  exit 0
fi

CUSTOM_TAG="$1"
USE_CUSTOM_TAG=false
[[ -n "$CUSTOM_TAG" ]] && USE_CUSTOM_TAG=true

if $USE_CUSTOM_TAG; then
  log "🚀 Starting test release with custom tag: $CUSTOM_TAG" ""
else
  log "🚀 Starting test release..." ""
fi

# 1. Check git status
log "🔍 Checking git status..."
assert_clean_git false
echo ""

# 2. Check branch
assert_branch "any"
BRANCH=$(git branch --show-current)
log "📍 Current branch: $BRANCH" ""
echo ""

# 3. Get version
CURRENT_VERSION=$(get_version)
log "📦 Current version: $CURRENT_VERSION"
echo ""

# 4. Run release test gate before mutating build numbers or tags
run_release_test_suite "$ROOT"

# 5. Determine tag name
if $USE_CUSTOM_TAG; then
  TAG_NAME="$CUSTOM_TAG"
  log "🏷️  Using custom tag: $TAG_NAME" ""
  [[ "$TAG_NAME" != test-* ]] && log "⚠️  Warning: Tag should start with 'test-' for GitHub Actions" "$YELLOW"
else
  # Increment build number
  log "🔢 Incrementing build number..."
  BUILD_NUM=$(node -e "
    const fs = require('fs');
    const pkg = require('$PACKAGE_JSON');
    const v = pkg.version;
    let data = { version: v, buildNumber: 1 };
    try {
      const f = fs.readFileSync('$BUILD_NUMBER_FILE', 'utf8');
      const d = JSON.parse(f);
      if (d.version === v) data.buildNumber = (d.buildNumber || 0) + 1;
    } catch (_) {}
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync('$BUILD_NUMBER_FILE', JSON.stringify(data, null, 2) + '\n');
    console.log(data.buildNumber);
  ")
  log "✅ Build number: $BUILD_NUM" "$GREEN"
  TAG_NAME="test-${CURRENT_VERSION}-${BUILD_NUM}"
fi

# 6. Check tag doesn't exist
if git tag -l "$TAG_NAME" | grep -q .; then
  log "⚠️  Tag $TAG_NAME already exists!" "$YELLOW"
  exit 1
fi

# 7. Create and push tag
create_and_push_tag "$TAG_NAME"

echo ""
echo "============================================================"
log "🎉 Test release completed successfully!" "$GREEN"
echo "============================================================"
log "📦 Version: $CURRENT_VERSION" "$BLUE"
log "🏷️  Tag: $TAG_NAME" "$BLUE"
log "💡 GitHub Actions will build and deploy to test environment" "$BLUE"
echo ""
