#!/usr/bin/env bash
# Downloads (once, politely, 3 s apart) the IEM ASOS/METAR archive for the 70 airports ranked 31-100 by departures
# (ledger_stations.txt: IATA, IEM station id, time zone), 1 May-1 Aug 2026, local time, routine + special reports.
# Together with the 30 storm-study airports this covers the top 100 departure airports (91% of US flights), so the
# disruption ledger can match weather at BOTH ends of most flights and cover RDU.
# Files go to units/ltools/public-data/weather/asos-ledger/<IATA>.csv (kept apart from asos/, which build_storms.sql
# globs, so the storm study's tables are unchanged).
# Source: IEM ASOS archive (Iowa State University, redistributing NWS observations, free).
# Usage: bash /home/andrew/Project/work/units/ltools/model-repo/datasets/flights/ledger/fetch_ledger_weather.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(cd "$HERE/../../../.." && pwd)/public-data/weather/asos-ledger"
mkdir -p "$OUT"
UA="ltools-research (public-data study)"
while read -r iata st tz; do
  [ -z "$iata" ] && continue
  [ -s "$OUT/$iata.csv" ] && continue
  tze="${tz//\//%2F}"
  curl -sSf -A "$UA" -o "$OUT/$iata.csv.part" \
    "https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=$st&data=all&year1=2026&month1=5&day1=1&year2=2026&month2=8&day2=2&tz=$tze&format=onlycomma&latlon=no&elev=no&missing=empty&trace=T&direct=no&report_type=3&report_type=4" \
    && mv "$OUT/$iata.csv.part" "$OUT/$iata.csv"
  printf '%s %s lines\n' "$iata" "$(wc -l < "$OUT/$iata.csv")"
  sleep 3
done < "$HERE/ledger_stations.txt"
