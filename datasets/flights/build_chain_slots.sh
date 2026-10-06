#!/usr/bin/env bash
# Superseded by build_summaries.sh, which rebuilds chain_slots.parquet together with the other summary files the
# flights dashboards read (same Malloy query, same output). Kept so the old command still works.
# Usage: bash /home/andrew/Project/work/units/ltools/model-repo/datasets/flights/build_chain_slots.sh [out_dir]
exec bash "$(dirname "$0")/build_summaries.sh" "$@"
