#!/usr/bin/env bash
# Tests for check-version.sh. Each case builds a throwaway repository layout in
# a temp directory, so the real manifests are never touched.
set -euo pipefail
script="$(cd "$(dirname "$0")" && pwd)/check-version.sh"
failures=0

# fixture <cargo> <firmware> <stage> <pubspec>: writes the four manifests.
fixture() {
  local root
  root="$(mktemp -d)"
  mkdir -p "$root/tooling" "$root/firmware/esp32" "$root/web/stage" "$root/apps/client"
  cp "$script" "$root/tooling/"
  printf '[workspace.package]\nversion = "%s"\n' "$1" > "$root/Cargo.toml"
  printf '[package]\nversion = "%s"\n' "$2" > "$root/firmware/esp32/Cargo.toml"
  printf '{\n  "version": "%s",\n}\n' "$3" > "$root/web/stage/package.json"
  printf 'name: nl_client\nversion: %s\n' "$4" > "$root/apps/client/pubspec.yaml"
  echo "$root"
}

# expect <pass|fail> <description> <fixture root> [tag]
expect() {
  local want="$1" name="$2" root="$3"
  shift 3
  if output="$(bash "$root/tooling/check-version.sh" "$@" 2>&1)"; then got=pass; else got=fail; fi
  if [[ "$got" == "$want" ]]; then
    echo "ok   $name"
  else
    echo "FAIL $name (expected $want, got $got): $output"
    failures=$((failures + 1))
  fi
  rm -rf "$root"
}

expect pass "matching versions"              "$(fixture 1.2.3 1.2.3 1.2.3 1.2.3+7)"
expect pass "matching tag"                   "$(fixture 1.2.3 1.2.3 1.2.3 1.2.3+7)" v1.2.3
expect pass "pre-release tag"                "$(fixture 1.2.3-rc.1 1.2.3-rc.1 1.2.3-rc.1 1.2.3-rc.1+9)" v1.2.3-rc.1
expect fail "firmware out of sync"           "$(fixture 1.2.3 1.2.2 1.2.3 1.2.3+7)"
expect fail "stage out of sync"              "$(fixture 1.2.3 1.2.3 1.3.0 1.2.3+7)"
expect fail "client out of sync"             "$(fixture 1.2.3 1.2.3 1.2.3 1.2.4+7)"
expect fail "tag does not match"             "$(fixture 1.2.3 1.2.3 1.2.3 1.2.3+7)" v1.2.4
expect fail "tag without v prefix"           "$(fixture 1.2.3 1.2.3 1.2.3 1.2.3+7)" 1.2.3
expect fail "unsupported pre-release label"  "$(fixture 1.2.3-dev 1.2.3-dev 1.2.3-dev 1.2.3-dev+1)"

if [[ $failures -gt 0 ]]; then
  echo "$failures check-version test(s) failed" >&2
  exit 1
fi
