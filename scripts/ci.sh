#!/usr/bin/env bash
# The whole CI check in one script, so any host (GitHub Actions, Azure Pipelines,
# Jenkins, a laptop) runs the same steps: install from the lockfile, type check,
# run the tests, then a production build. Needs Node 20 or later and pnpm 10
# (falls back to npx when pnpm isn't installed). No secrets are needed.
set -euo pipefail

cd "$(dirname "$0")/.."

if command -v pnpm >/dev/null 2>&1; then
  PNPM=(pnpm)
else
  PNPM=(npx --yes pnpm@10.33.2)
fi

export NEXT_TELEMETRY_DISABLED=1

step() { printf '\n== %s\n' "$1"; }

step "Install (frozen lockfile)"
"${PNPM[@]}" install --frozen-lockfile

step "Type check"
"${PNPM[@]}" exec tsc --noEmit

step "Tests"
"${PNPM[@]}" exec tsx scripts/test.ts

step "Build"
"${PNPM[@]}" exec next build

step "CI passed"
