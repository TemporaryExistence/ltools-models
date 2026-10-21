#!/usr/bin/env bash
# Fetch NWS Storm Prediction Center (SPC) convective outlook history (Day 1 and Day 2, categorical) for each of the
# 99 ledger airports from the IEM point service (Iowa State University; SPC outlooks are US public domain).
# One request per airport per day-type, 3 s apart. Output: public-data/weather/spc/<IATA>_d<1|2>.json
# Usage: bash datasets/flights/insurance/fetch_spc.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
FL="$(cd "$HERE/.." && pwd)"
OUT="$(cd "$HERE/../../../../public-data/weather" && pwd)/spc"
mkdir -p "$OUT"
AIRPORTS=$(duckdb -noheader -list -c "SELECT DISTINCT origin FROM '$OUT/../out/ledger_wx_days.parquet' ORDER BY 1")
for a in $AIRPORTS; do
  read -r lat lon < <(awk -F, -v a="$a" '$1==a {print $2, $3}' "$FL/airport_coords.csv")
  for d in 1 2; do
    f="$OUT/${a}_d$d.json"
    [ -s "$f" ] && continue
    curl -s --max-time 90 "https://mesonet.agron.iastate.edu/json/spcoutlook.py?lat=$lat&lon=$lon&last=600&day=$d&cat=categorical" > "$f.tmp" && mv "$f.tmp" "$f"
    sleep 3
  done
done
ls "$OUT" | wc -l
