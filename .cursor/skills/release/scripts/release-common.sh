#!/usr/bin/env bash
# Shared release script utilities. Source from release-test.sh or release-prod.sh.

_RELEASE_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_project_root() {
  local dir="$_RELEASE_SCRIPT_DIR"
  while [[ "$dir" != "/" ]]; do
    [[ -f "$dir/package.json" ]] && echo "$dir" && return 0
    dir="$(dirname "$dir")"
  done
  echo "Could not find project root (package.json)" >&2
  return 1
}

init_release_env() {
  ROOT="$(find_project_root)"
  APP_ROOT="$ROOT/web"
  PACKAGE_JSON="$APP_ROOT/package.json"
  cd "$ROOT"
}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${2:-$NC}$1${NC}"; }

source "$_RELEASE_SCRIPT_DIR/release-quality-gates.sh"

get_version() {
  node -p "require('$PACKAGE_JSON').version" 2>/dev/null || {
    log "❌ Error reading package.json" "$RED"
    exit 1
  }
}

# Bump version: patch 2.5.8→2.5.9, minor 2.5.8→2.6.0, major 2.5.8→3.0.0
bump_version() {
  local type="$1"
  local ver="$2"
  local major minor patch
  IFS=. read -r major minor patch <<< "$ver"
  case "$type" in
    patch) echo "$major.$minor.$((patch + 1))" ;;
    minor) echo "$major.$((minor + 1)).0" ;;
    major) echo "$((major + 1)).0.0" ;;
    *) log "❌ Invalid version type: $type" "$RED"; exit 1 ;;
  esac
}

tag_exists_on_origin() {
  local version="$1"
  local tag="v$version"
  git fetch --tags origin 2>/dev/null || true
  git ls-remote --tags origin "$tag" 2>/dev/null | grep -q . && return 0 || return 1
}

# allowed: "master main" or "any"
assert_branch() {
  local allowed="$1"
  local branch
  branch=$(git branch --show-current 2>/dev/null || true)
  if [[ -z "$branch" ]]; then
    log "❌ Detached HEAD. Checkout a branch first." "$RED"
    exit 1
  fi
  if [[ "$allowed" == "any" ]]; then
    return 0
  fi
  if [[ " $allowed " != *" $branch "* ]]; then
    log "❌ You are on branch '$branch', not $allowed" "$RED"
    exit 1
  fi
}

# required: true = fail if dirty, false = warn only
assert_clean_git() {
  local required="$1"
  local status
  status=$(git status --porcelain 2>/dev/null || true)
  if [[ -n "$status" ]]; then
    if [[ "$required" == "true" ]]; then
      log "❌ Git working directory is dirty" "$RED"
      echo "$status"
      log "Please commit or stash changes first." "$YELLOW"
      exit 1
    else
      log "⚠️  Git working directory is dirty (uncommitted changes)" "$YELLOW"
      echo "$status"
      log "⚠️  Continuing with test release" "$YELLOW"
    fi
  else
    log "✅ Git working directory is clean" ""
  fi
}

create_and_push_tag() {
  local tag_name="$1"
  log "🏷️  Creating tag: $tag_name" ""
  git tag "$tag_name"
  log "✅ Tag created: $tag_name" "$GREEN"
  log "🚀 Pushing tag to remote..." ""
  git push origin "$tag_name"
  log "✅ Tag pushed: $tag_name" "$GREEN"
}
