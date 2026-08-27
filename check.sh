#!/usr/bin/env bash
# One command that proves the app. Run from the worktree root.
cd "$(dirname "$0")"
line(){ printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
FAIL=0

line "TYPES"
if npx tsc --noEmit -p tsconfig.app.json --tsBuildInfoFile .tsb-check 2>&1 | grep -E "error TS" | head -20; then :; fi
npx tsc --noEmit -p tsconfig.app.json --tsBuildInfoFile .tsb-check >/dev/null 2>&1 \
  && echo "  clean" || { echo "  FAILED"; FAIL=1; }

line "CASE COLLISIONS (Windows: two files differing only in case)"
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -printf '%f\n' \
  | tr 'A-Z' 'a-z' | sed 's/\.[^.]*$//' | sort | uniq -d \
  | while read -r n; do echo "  COLLIDES: $n"; done
echo "  (nothing listed = none)"

line "STYLE CONTRACT"
node tools/check-styles.mjs 2>&1 | sed -n '2,6p;/NEW ORPHAN/,/^$/p' | head -30
node tools/check-styles.mjs >/dev/null 2>&1 && echo "  clean" || { echo "  FAILED"; FAIL=1; }

line "UNIT TESTS"
npx vitest run --reporter=dot 2>&1 | tail -12 || FAIL=1

line "REACHABILITY"
node tools/check-reachability.mjs 2>&1 | tail -6 || FAIL=1

line "RESULT"
[ "$FAIL" = 0 ] && echo "  ALL GREEN" || echo "  SOMETHING FAILED (above)"
exit $FAIL
