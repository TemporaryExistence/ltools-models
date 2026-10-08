#!/usr/bin/env bash
# Convert BTS On-Time PREZIP months (Feb-Apr 2026) to Parquet with the same columns as flights_2026_0{5,6,7}.parquet,
# streaming the CSV out of the zip (no extracted copy). Downloads (polite, one file at a time, 3 s apart):
#   https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2026_<M>.zip
# Usage: bash /home/andrew/Project/work/units/ltools/model-repo/datasets/flights/airline_risk/convert_prezip.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(cd "$HERE/../../../../public-data/flights-prezip" && pwd)"
for m in 2 3 4; do
  out="$DIR/flights_2026_0$m.parquet"
  [ -s "$out" ] && { echo "have $out"; continue; }
  if [ ! -s "$DIR/2026_$m.zip" ]; then
    curl -sS -f -o "$DIR/2026_$m.zip" \
      "https://transtats.bts.gov/PREZIP/On_Time_Reporting_Carrier_On_Time_Performance_1987_present_2026_$m.zip"
    sleep 3
  fi
  unzip -p "$DIR/2026_$m.zip" '*.csv' | duckdb -bail -c "
    COPY (SELECT
      FlightDate::DATE flight_date, Reporting_Airline carrier, Flight_Number_Reporting_Airline::INTEGER flight_number,
      Tail_Number tail_number, Origin origin, OriginCityName origin_city, OriginState origin_state, Dest dest,
      DestCityName dest_city, DestState dest_state, CRSDepTime::INTEGER sched_dep_hhmm, DepDelay::DOUBLE dep_delay_min,
      ArrDelay::DOUBLE arr_delay_min, ArrDel15::DOUBLE = 1 arrived_late, Cancelled::DOUBLE = 1 cancelled,
      CancellationCode cancellation_code, Diverted::DOUBLE = 1 diverted, AirTime::DOUBLE air_time_min,
      Distance::DOUBLE distance_miles, CarrierDelay::DOUBLE carrier_delay_min, WeatherDelay::DOUBLE weather_delay_min,
      NASDelay::DOUBLE nas_delay_min, SecurityDelay::DOUBLE security_delay_min,
      LateAircraftDelay::DOUBLE late_aircraft_delay_min
    FROM read_csv('/dev/stdin', header = true, all_varchar = true))
    TO '$out' (FORMAT parquet, COMPRESSION zstd)"
  echo "$out $(duckdb -noheader -list -c "SELECT count(*) || ' rows ' || min(flight_date) || '..' || max(flight_date) FROM '$out'")"
done
