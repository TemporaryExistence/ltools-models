#!/usr/bin/env bash
# Build the flight-delay cover pricing tables (ins_*). Needs the ledger build's weather (ledger_wx_days.parquet,
# asos/, asos-ledger/) and the SPC outlook history (fetch_spc.sh). With --upload, copies the tables into MotherDuck
# ltools.flights (token from the motherduck_token variable, never printed; no sign-in is attempted without it).
# Usage: bash /home/andrew/Project/work/units/ltools/model-repo/datasets/flights/insurance/build_insurance.sh [--upload]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FL="$(cd "$HERE/.." && pwd)"
PUBLIC="$(cd "$HERE/../../../../public-data" && pwd)"
WX="$PUBLIC/weather"
[ "$(ls "$WX/spc"/*.json 2>/dev/null | wc -l)" -ge 198 ] || bash "$HERE/fetch_spc.sh"
TABLES="ins_cells ins_validation ins_calibration ins_july_cells ins_weather ins_airport_storm ins_signals ins_july_summary ins_checks"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
ln -s "$WX/asos" "$WORK/asos"; ln -s "$WX/asos-ledger" "$WORK/asos-ledger"; ln -s "$WX/out" "$WORK/out"; ln -s "$WX/spc" "$WORK/spc"
ln -s "$PUBLIC/datasets/flights" "$WORK/flights"
{ echo "iata,tz"; awk '{print $1","$3}' "$FL/ledger/ledger_stations.txt"; awk '{print $1","$2}' "$FL/storms/stations.txt"; } > "$WORK/tz.csv"
(cd "$WORK" && duckdb -bail < "$HERE/build_insurance.sql")
for t in $TABLES; do
  printf '%-18s %8s rows\n' "$t" "$(duckdb -noheader -list -c "SELECT count(*) FROM '$WX/out/$t.parquet'")"
done
duckdb -c "SELECT k, round(v, 4) v FROM '$WX/out/ins_checks.parquet'"
if [ "${1:-}" = "--upload" ]; then
  if [ -z "${motherduck_token:-}" ]; then motherduck_token="$(bash -ic 'printf %s "${motherduck_token:-}"' 2>/dev/null)"; fi
  [ -n "$motherduck_token" ] || { echo "motherduck_token not set; not uploading (no sign-in attempted)"; exit 1; }
  export motherduck_token MOTHERDUCK_TOKEN="$motherduck_token"
  sql="ATTACH 'md:ltools';"
  for t in $TABLES; do sql="$sql CREATE OR REPLACE TABLE ltools.flights.$t AS SELECT * FROM '$WX/out/$t.parquet';"; done
  duckdb -c "$sql"
  for t in $TABLES; do
    printf 'md:ltools.flights.%-18s %8s rows\n' "$t" "$(duckdb -noheader -list -c "ATTACH 'md:ltools'; SELECT count(*) FROM ltools.flights.$t")"
  done
fi
