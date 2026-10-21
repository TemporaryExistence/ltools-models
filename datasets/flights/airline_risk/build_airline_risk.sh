#!/usr/bin/env bash
# Build the airline-risk and airport-scorecard tables (ar_* and ap_*):
#   1. Feb-Apr 2026 BTS months via convert_prezip.sh (May-Jul are already in public-data/datasets/flights/).
#   2. DOT Consumer Airfare Report Table 1a (airport-pair fares), 2026 Q1 and 2025 Q2, from data.transportation.gov.
#   3. Runs build_airline_risk.sql + 60 grouping passes (cluster_pass.sql) + build_airline_risk_2.sql in DuckDB.
#   4. With --upload, copies the tables into MotherDuck ltools.flights (token from motherduck_token; never printed;
#      no sign-in is attempted without it).
# Outputs: units/ltools/public-data/airline-risk/*.parquet.
# Usage: bash datasets/flights/airline_risk/build_airline_risk.sh [--upload]
set -euo pipefail
UPLOAD="${1:-}"
HERE="$(cd "$(dirname "$0")" && pwd)"
FL="$(cd "$HERE/.." && pwd)"
PUBLIC="$(cd "$HERE/../../../../public-data" && pwd)"
OUT="$PUBLIC/airline-risk"; mkdir -p "$OUT" "$PUBLIC/fares"
TABLES="ar_watch ar_chronic_months ar_chronic_flights ar_refund ar_checks ap_airports ap_peers ap_routes ap_split ap_together"

bash "$HERE/convert_prezip.sh"
for yq in "2026 1" "2025 2"; do
  set -- $yq; f="$PUBLIC/fares/cfr_table1a_$1q$2.csv"
  [ -s "$f" ] || { curl -sS -f -o "$f" "https://data.transportation.gov/resource/tfrh-tu9e.csv?\$where=year=$1%20AND%20quarter=$2&\$limit=5000"; sleep 2; }
done

WORK="$(mktemp -d -p "$PUBLIC")"; trap 'rm -r "$WORK"' EXIT
ln -s "$PUBLIC/datasets/flights" "$WORK/flights"; ln -s "$PUBLIC/flights-prezip" "$WORK/prezip"
ln -s "$PUBLIC/fares" "$WORK/fares"; ln -s "$PUBLIC/weather/asos" "$WORK/asos"
ln -s "$PUBLIC/weather/asos-ledger" "$WORK/asos-ledger"; ln -s "$PUBLIC/weather/out" "$WORK/wxout"
ln -s "$OUT" "$WORK/out"; ln -s "$FL/airport_coords.csv" "$WORK/coords.csv"
{
  cat "$HERE/build_airline_risk.sql"
  for i in $(seq 1 60); do echo "set variable pass = $i;"; cat "$HERE/cluster_pass.sql"; done
  cat "$HERE/build_airline_risk_2.sql"
} > "$WORK/all.sql"
(cd "$WORK" && duckdb -bail "$WORK/db.duckdb" < "$WORK/all.sql")

for t in $TABLES; do printf '%-20s %8s rows\n' "$t" "$(duckdb -noheader -list -c "SELECT count(*) FROM '$OUT/$t.parquet'")"; done
duckdb -c "SELECT k, round(v, 2) v FROM '$OUT/ar_checks.parquet'"

if [ "$UPLOAD" = "--upload" ]; then
  if [ -z "${motherduck_token:-}" ]; then motherduck_token="$(bash -ic 'printf %s "${motherduck_token:-}"' 2>/dev/null)"; fi
  [ -n "$motherduck_token" ] || { echo "motherduck_token not set; not uploading (no sign-in attempted)"; exit 1; }
  export motherduck_token
  sql="ATTACH 'md:ltools';"
  for t in $TABLES; do sql="$sql CREATE OR REPLACE TABLE ltools.flights.$t AS SELECT * FROM '$OUT/$t.parquet';"; done
  duckdb -c "$sql"
  for t in $TABLES; do
    printf 'md:ltools.flights.%-20s %8s rows\n' "$t" "$(duckdb -noheader -list -c "ATTACH 'md:ltools'; SELECT count(*) FROM ltools.flights.$t")"
  done
fi
