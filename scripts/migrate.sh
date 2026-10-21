#!/usr/bin/env bash
# ============================================================
# SCALD — migration runner (self-hosted Postgres)
#
#   DATABASE_URL=postgresql://postgres:PASS@localhost:5432/postgres \
#     ./scripts/migrate.sh [--dry-run]
#
#   ./scripts/migrate.sh --baseline 022
#     For a database whose schema was built WITHOUT this runner — e.g. the
#     Supabase Cloud project, where migrations were pasted into the SQL Editor.
#     It has no schema_migrations table, so a plain run would start at 001
#     and fail ("type already exists"). --baseline records 001…022 as applied
#     without running them; the next plain run applies 023 onwards. It first
#     checks a fingerprint of the given version so a wrong number can't
#     silently skip a migration the database never had.
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
BASELINE=""
case "${1:-}" in
  --dry-run)  DRY_RUN=true ;;
  --baseline) BASELINE="${2:?--baseline needs a version number, e.g. --baseline 022}" ;;
esac

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

if [[ -n "$BASELINE" ]]; then
  # Fingerprints: an object each migration creates, to prove the database
  # really is at that version before we mark everything up to it as done.
  case "$BASELINE" in
    022) probe="SELECT to_regprocedure('public.is_year_approved(uuid,integer)') IS NOT NULL" ;;
    021) probe="SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='tour_completed_at')" ;;
    *)   echo "No fingerprint known for $BASELINE; supported: 021, 022." >&2; exit 1 ;;
  esac
  if [[ "$(psql_q -c "$probe")" != "t" ]]; then
    echo "This database does not look like it is at $BASELINE — refusing to baseline." >&2
    exit 1
  fi
  n=0
  for f in "$DIR"/*.sql; do
    version="$(basename "$f" .sql)"
    [[ "${version%%_*}" > "$BASELINE" ]] && break
    psql_q -c "INSERT INTO public.schema_migrations (version) VALUES ('$version') ON CONFLICT DO NOTHING;" >/dev/null
    n=$((n + 1))
  done
  echo "Baselined: $n migration(s) up to $BASELINE recorded as applied (none were run)."
  echo "Now run without --baseline to apply the rest."
  exit 0
fi

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
