#!/usr/bin/env bash
# Build the disruption ledger tables (ledger_cells, ledger_slots, ledger_insurer, ledger_checks, ledger_wx_days).
#   1. Needs the storm-study ASOS files (storms/build_storms.sh) and the 70 extra airports (fetch_ledger_weather.sh).
#   2. Runs build_ledger.sql in DuckDB against those files and the monthly BTS flights Parquet.
#   3. With --upload, copies the tables into MotherDuck ltools.flights (token from the motherduck_token variable,
#      never printed; no sign-in is attempted without it).
# Outputs: units/ltools/public-data/weather/out/ledger_*.parquet.
# Usage: bash /home/andrew/Project/work/units/ltools/model-repo/datasets/flights/ledger/build_ledger.sh [--upload]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
PUBLIC="$(cd "$REPO/../public-data" && pwd)"
WX="$PUBLIC/weather"
[ -n "$(ls "$WX/asos-ledger" 2>/dev/null)" ] || bash "$HERE/fetch_ledger_weather.sh"
mkdir -p "$WX/out"
TABLES="ledger_cells ledger_slots ledger_insurer ledger_checks ledger_wx_days"

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
ln -s "$WX/asos" "$WORK/asos"; ln -s "$WX/asos-ledger" "$WORK/asos-ledger"; ln -s "$WX/out" "$WORK/out"
ln -s "$PUBLIC/datasets/flights" "$WORK/flights"
(cd "$WORK" && duckdb -bail < "$HERE/build_ledger.sql")

for t in $TABLES; do
  printf '%-16s %8s rows\n' "$t" "$(duckdb -noheader -list -c "SELECT count(*) FROM '$WX/out/$t.parquet'")"
done
duckdb -c "SELECT k, round(v, 2) v FROM '$WX/out/ledger_checks.parquet'"

if [ "${1:-}" = "--upload" ]; then
  if [ -z "${motherduck_token:-}" ]; then motherduck_token="$(bash -ic 'printf %s "${motherduck_token:-}"' 2>/dev/null)"; fi
  [ -n "$motherduck_token" ] || { echo "motherduck_token not set; not uploading (no sign-in attempted)"; exit 1; }
  export motherduck_token
  sql="ATTACH 'md:ltools';"
  for t in $TABLES; do sql="$sql CREATE OR REPLACE TABLE ltools.flights.$t AS SELECT * FROM '$WX/out/$t.parquet';"; done
  duckdb -c "$sql"
  for t in $TABLES; do
    printf 'md:ltools.flights.%-16s %8s rows\n' "$t" "$(duckdb -noheader -list -c "ATTACH 'md:ltools'; SELECT count(*) FROM ltools.flights.$t")"
  done
fi
