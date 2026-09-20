#!/usr/bin/env bash
# ============================================================
# SCALD — migration runner (self-hosted Postgres)
#
#   DATABASE_URL=postgresql://postgres:PASS@localhost:5432/postgres \
#     ./scripts/migrate.sh [--dry-run]
#
# Why a runner instead of `psql -f` in a loop: the migrations are NOT
# idempotent (001 creates types, 004 rewrites enum values, 012 creates
# policies). Re-running one aborts halfway. This records what has been
# applied in public.schema_migrations and skips those, so an interrupted
# deployment can simply be re-run.
#
# Each file runs inside a single transaction; a failure rolls that file back
# and stops the run, leaving the database on the last good migration.
# ============================================================
set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

: "${DATABASE_URL:?DATABASE_URL is required}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/migrations"
[[ -d "$DIR" ]] || { echo "migrations directory not found: $DIR" >&2; exit 1; }

psql_q() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qtA "$@"; }

# PostgREST exposes everything in `public`, so this bookkeeping table needs
# RLS like any other. No policy is created on purpose: nothing should read it
# over the API. postgres/service_role bypass RLS and still see it.
psql_q -c "
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version     TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schema_migrations FROM anon, authenticated;" >/dev/null

applied="$(psql_q -c "SELECT version FROM public.schema_migrations;")"

pending=0
for f in "$DIR"/*.sql; do
  version="$(basename "$f" .sql)"
  if grep -qxF "$version" <<<"$applied"; then
    printf '  skip   %s\n' "$version"
    continue
  fi
  pending=$((pending + 1))

  if $DRY_RUN; then
    printf '  would apply  %s\n' "$version"
    continue
  fi

  printf '  apply  %s ... ' "$version"
  # The migration files carry their own BEGIN/COMMIT; --single-transaction
  # would nest and warn, so wrap the bookkeeping insert into the same psql
  # invocation instead and let the file's own transaction do the work.
  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
       -f "$f" \
       -c "INSERT INTO public.schema_migrations (version) VALUES ('$version');" >/dev/null; then
    echo 'ok'
  else
    echo 'FAILED'
    echo "Stopped at $version. The database is still on the previous migration." >&2
    exit 1
  fi
done

if [[ $pending -eq 0 ]]; then
  echo 'Database is up to date.'
else
  $DRY_RUN && echo "$pending migration(s) pending." || echo "Applied $pending migration(s)."
fi
