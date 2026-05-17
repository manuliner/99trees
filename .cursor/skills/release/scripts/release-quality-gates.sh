#!/usr/bin/env bash
# Shared release quality gates. Source from release-common.sh.

has_pnpm_script() {
  local app_root="$1"
  local script_name="$2"
  node -e "
    const p = require('${app_root}/package.json');
    process.exit(p?.scripts && Object.prototype.hasOwnProperty.call(p.scripts, '${script_name}') ? 0 : 1);
  " >/dev/null 2>&1
}

run_release_test_suite() {
  local root="$1"

  if [[ ! -f "$root/package.json" ]]; then
    log \"❌ Could not find package.json at: $root/package.json\" \"$RED\"
    exit 1
  fi

  # Always typecheck (cheap + high-signal)
  if has_pnpm_script "$root" "typecheck"; then
    log \"🧪 Running release gate: typecheck\" \"$BLUE\"
    pnpm --dir "$root" typecheck
    log \"✅ Typecheck passed\" \"$GREEN\"
    echo \"\"
  fi

  # Run tests only if repo defines a test script
  if has_pnpm_script "$root" "test"; then
    log \"🧪 Running release gate: tests\" \"$BLUE\"
    pnpm --dir "$root" test
    log \"✅ Tests passed\" \"$GREEN\"
    echo \"\"
  fi
}

