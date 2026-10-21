#!/usr/bin/env bash
# Build the storm tables for the flights model (storm_days, storm_hours, storm_cube, storm_route_pairs, storm_ci).
#   1. Downloads (once, politely, 3 s apart) the IEM ASOS/METAR archive for the 30 airports in stations.txt,
#      1 May-1 Aug 2026, local time, routine + special reports, and the NOAA NCEI Storm Events 2026 details file.
#   2. Runs build_storms.sql in DuckDB against those files and the monthly BTS flights Parquet.
#   3. With --upload, copies the five tables into MotherDuck ltools.flights (token from the motherduck_token
#      variable, never printed).
# Sources: IEM ASOS archive (Iowa State University, redistributing NWS observations, free) and NOAA NCEI Storm
# Events Database (public domain). Large files stay under units/ltools/public-data/weather/.
#
# Usage: bash datasets/flights/storms/build_storms.sh [--upload]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../.." && pwd)"
PUBLIC="$(cd "$REPO/../public-data" && pwd)"
WX="$PUBLIC/weather"
mkdir -p "$WX/asos" "$WX/storm-events" "$WX/out"
UA="ltools-research (public-data study)"

while read -r st tz; do
  [ -z "$st" ] && continue
  [ -s "$WX/asos/$st.csv" ] && continue
  tze="${tz//\//%2F}"
  curl -sSf -A "$UA" -o "$WX/asos/$st.csv" \
    "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=$st&data=all&year1=2026&month1=5&day1=1&year2=2026&month2=8&day2=2&tz=$tze&format=onlycomma&latlon=no&elev=no&missing=empty&trace=T&direct=no&report_type=3&report_type=4"
  sleep 3
done < "$HERE/stations.txt"

SE="StormEvents_details-ftp_v1.0_d2026_c20260918.csv.gz"
[ -s "$WX/storm-events/$SE" ] || curl -sSf -A "$UA" -o "$WX/storm-events/$SE" \
  "https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/$SE"

WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
ln -s "$WX/asos" "$WORK/asos"; ln -s "$WX/storm-events" "$WORK/storm-events"; ln -s "$WX/out" "$WORK/out"
ln -s "$PUBLIC/datasets/flights" "$WORK/flights"; ln -s "$HERE/../airport_coords.csv" "$WORK/airport_coords.csv"
(cd "$WORK" && duckdb -bail < "$HERE/build_storms.sql")

for t in storm_days storm_hours storm_cube storm_route_pairs storm_ci; do
  printf '%-18s %8s rows %9s bytes\n' "$t" "$(duckdb -noheader -list -c "SELECT count(*) FROM '$WX/out/$t.parquet'")" "$(stat -c %s "$WX/out/$t.parquet")"
done

if [ "${1:-}" = "--upload" ]; then
  if [ -z "${motherduck_token:-}" ]; then motherduck_token="$(bash -ic 'printf %s "${motherduck_token:-}"' 2>/dev/null)"; fi
  [ -n "$motherduck_token" ] || { echo "motherduck_token not set; not uploading (no sign-in attempted)"; exit 1; }
  export motherduck_token
  sql="ATTACH 'md:ltools';"
  for t in storm_days storm_hours storm_cube storm_route_pairs storm_ci; do
    sql="$sql CREATE OR REPLACE TABLE ltools.flights.$t AS SELECT * FROM '$WX/out/$t.parquet';"
  done
  duckdb -c "$sql"
  for t in storm_days storm_hours storm_cube storm_route_pairs storm_ci; do
    printf 'md:ltools.flights.%-18s %8s rows\n' "$t" "$(duckdb -noheader -list -c "ATTACH 'md:ltools'; SELECT count(*) FROM ltools.flights.$t")"
  done
fi
