#!/usr/bin/env bash
# Verifies that every component declares the same project version and, when a
# release tag is given, that the tag matches it.
#
#   tooling/check-version.sh            # consistency only (CI on every change)
#   tooling/check-version.sh v1.2.3     # also require tag == v<version>
#
# Versions follow vMAJOR.MINOR.PATCH with optional -alpha.N / -beta.N / -rc.N.
# Prints the version on success so workflows can capture it.
set -euo pipefail
cd "$(dirname "$0")/.."

# First `version = "..."` line of a Cargo manifest (the package/workspace one).
cargo_version() { sed -n 's/^version = "\(.*\)"$/\1/p' "$1" | head -n 1; }

declare -A versions=(
  [Cargo.toml]="$(cargo_version Cargo.toml)"
  [firmware/esp32/Cargo.toml]="$(cargo_version firmware/esp32/Cargo.toml)"
  [web/stage/package.json]="$(sed -n 's/^  "version": "\(.*\)",$/\1/p' web/stage/package.json)"
  # Flutter versions carry a build number after "+", which is not part of the
  # project version.
  [apps/client/pubspec.yaml]="$(sed -n 's/^version: \([^+]*\).*$/\1/p' apps/client/pubspec.yaml)"
)

expected="${versions[Cargo.toml]}"
status=0
for file in "${!versions[@]}"; do
  if [[ -z "${versions[$file]}" ]]; then
    echo "error: no version found in $file" >&2
    status=1
  elif [[ "${versions[$file]}" != "$expected" ]]; then
    echo "error: $file has version ${versions[$file]}, Cargo.toml has $expected" >&2
    status=1
  fi
done

if ! [[ "$expected" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)\.[0-9]+)?$ ]]; then
  echo "error: version $expected is not MAJOR.MINOR.PATCH[-alpha.N|-beta.N|-rc.N]" >&2
  status=1
fi

if [[ $# -ge 1 && "$1" != "v$expected" ]]; then
  echo "error: tag $1 does not match project version v$expected" >&2
  status=1
fi

[[ $status -eq 0 ]] && echo "$expected"
exit $status
