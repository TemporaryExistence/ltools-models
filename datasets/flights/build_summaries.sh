#!/usr/bin/env bash
# Rebuild the small summary files the flights dashboards read, from the monthly flights files:
#   chain_slots.parquet          one row per airline x first-flight origin x scheduled hour that started a late delay chain
#   flights_cube.parquet         month x airline x origin x scheduled departure hour (counts and sums)
#   flights_legs.parquet         month x airline x origin x leg of the aircraft's day x how the day started (counts)
#   flights_daily.parquet        date x airline x origin (counts)
#   flights_routes.parquet       month x airline x route (counts and sums)
#   flights_inbound.parquet      later flights of the day by the airport the aircraft flew in from
#   flights_chain_starts.parquet late later flights by the airport whose late first flight started the chain
#   flights_airlines.parquet     airline list (Airline filter)
#   flights_airports.parquet     airport list: city, state, size band, departures, chain minutes, latitude/longitude
#
# Why: the hosted instance returned empty responses for dashboards that ran window functions over the 1.85M flights
# (~30 MB of Parquet over HTTPS, 2-4.4 s locally). The dashboards now read these files (a few hundred KB) instead.
#
# The logic stays Malloy's: each file is a query in build_summaries.malloy (or the chain_slots source in
# flights.malloy). Step 1 asks the local author MCP server (`malloyyo mcp --develop`) to compile it to SQL (query tool,
# execute:false); step 2 runs that SQL once in DuckDB and COPYs the rows to Parquet. The dashboards read the files
# through the sources in summaries.malloy. The model is compiled in a temporary copy whose
# https://tabblabs.net/datasets/ URLs point at the local public-data files, so the build needs no network
# and works before the files are deployed. The airport list's latitude/longitude come from airport_coords.csv
# (OurAirports, public domain; see airport_coords.README.txt), joined by airport code.
#
# Rerun after any change to the flights files or to the queries, then redeploy every file to
# https://tabblabs.net/datasets/flights/.
#
# Usage: bash /home/andrew/Project/work/units/ltools/model-repo/datasets/flights/build_summaries.sh [out_dir]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
PUBLIC="$(cd "$REPO/../public-data/datasets" && pwd)"
OUT="${1:-$PUBLIC/flights}"
if ! command -v malloyyo >/dev/null; then
  MY="$(ls "$HOME"/.nvm/versions/node/*/bin/malloyyo 2>/dev/null | head -1)"
  export PATH="$(dirname "$MY"):$PATH"
fi
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT

# Temporary model copy reading local files.
mkdir -p "$WORK/repo/datasets"
cp "$REPO/malloy-config.json" "$WORK/repo/" 2>/dev/null || true
cp -r "$HERE" "$WORK/repo/datasets/flights"
sed -i "s#https://tabblabs.net/datasets/#$PUBLIC/#g" "$WORK/repo/datasets/flights/"*.malloy

compile() { # compile <model file> <malloy text> <sql out>
  python3 - "$WORK/repo" "$1" "$2" "$3" <<'PY'
import json, subprocess, sys
repo, model, malloy, out = sys.argv[1:5]
p = subprocess.Popen(["malloyyo", "mcp", "--develop"], cwd=repo, stdin=subprocess.PIPE,
                     stdout=subprocess.PIPE, text=True)
def send(m): p.stdin.write(json.dumps(m) + "\n"); p.stdin.flush()
def recv(i):
    while True:
        line = p.stdout.readline()
        if not line: sys.exit("author MCP server exited")
        try: m = json.loads(line)
        except ValueError: continue
        if m.get("id") == i: return m
send({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05",
      "capabilities": {}, "clientInfo": {"name": "build_summaries", "version": "1"}}})
recv(1); send({"jsonrpc": "2.0", "method": "notifications/initialized"})
send({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "query", "arguments": {
      "model_ref": "datasets/flights/" + model, "malloy": malloy, "execute": False,
      "question": "Materialise a flights summary file"}}})
r = json.loads(recv(2)["result"]["content"][0]["text"])
p.terminate()
if not r.get("ok") or not r.get("sql"): sys.exit("compile failed: " + json.dumps(r.get("problems")))
open(out, "w").write(r["sql"])
PY
}

copy() { # copy <sql file> <parquet out>
  duckdb -c "COPY ($(cat "$1")) TO '$2' (FORMAT parquet, COMPRESSION zstd);"
}

# 1. chain_slots.
compile flights.malloy "run: chain_slots -> {
  select: carrier, airline, origin, size_band, dep_hour, slot_late_first_legs, slot_downstream_legs, slot_minutes, slot_rank
  order_by: slot_rank
}" "$WORK/chain_slots.sql"
copy "$WORK/chain_slots.sql" "$OUT/chain_slots.parquet"

# 2. The summary queries in build_summaries.malloy.
for name in flights_cube flights_legs flights_daily flights_routes flights_inbound flights_chain_starts flights_airlines; do
  compile build_summaries.malloy "run: build_$name" "$WORK/$name.sql"
  copy "$WORK/$name.sql" "$OUT/$name.parquet"
done

# 3. Airport list: Malloy profile + Malloy chain minutes + OurAirports coordinates, joined by airport code.
compile build_summaries.malloy "run: build_airport_profile" "$WORK/airport_profile.sql"
compile build_summaries.malloy "run: build_airport_chains" "$WORK/airport_chains.sql"
duckdb -c "COPY (
  WITH p AS ($(cat "$WORK/airport_profile.sql")),
       c AS ($(cat "$WORK/airport_chains.sql")),
       g AS (SELECT * FROM read_csv('$HERE/airport_coords.csv'))
  SELECT p.origin, p.origin_city, p.origin_state, p.size_band, p.departures,
         p.departures / 92.0 AS departures_per_day, coalesce(c.chain_minutes, 0) AS chain_minutes,
         g.lat AS latitude, g.lon AS longitude
  FROM p LEFT JOIN c ON c.origin = p.origin LEFT JOIN g ON g.iata = p.origin
  ORDER BY p.departures DESC
) TO '$OUT/flights_airports.parquet' (FORMAT parquet, COMPRESSION zstd);"

for f in chain_slots flights_cube flights_legs flights_daily flights_routes flights_inbound flights_chain_starts flights_airlines flights_airports; do
  printf '%-22s %8s rows %9s bytes\n' "$f" \
    "$(duckdb -noheader -list -c "SELECT count(*) FROM '$OUT/$f.parquet'")" "$(stat -c %s "$OUT/$f.parquet")"
done
