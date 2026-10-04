# SCALD Architecture Overview

## System design

SCALD is a single Next.js application talking directly to a self-hosted
Supabase stack. There is no separate backend service: the browser queries
Postgres through PostgREST, and row-level security — not application code —
is what keeps one municipality's data away from another's.

```
                    ┌──────────────────────────┐
   browser  ───────▶│  Caddy (TLS, :443)       │
                    └────────────┬─────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              ▼                                     ▼
   ┌─────────────────────┐              ┌─────────────────────┐
   │  Next.js 15 (:3000) │              │  Kong (:8000)       │
   │  apps/web           │─────────────▶│  Supabase gateway   │
   │  App Router, RSC    │   anon key   └──────────┬──────────┘
   └─────────────────────┘                         │
              │                        ┌───────────┼───────────┐
              │ service-role key       ▼           ▼           ▼
              │ (server-side only)  GoTrue     PostgREST    Studio
              └────────────────────────┴───────────┼───────────┘
                                                   ▼
                                       ┌───────────────────────┐
                                       │  PostgreSQL           │
                                       │  RLS on every table   │
                                       └───────────────────────┘
```

Deployment details are in [../deployment/RUNBOOK.md](../deployment/RUNBOOK.md).

## Key design decisions

### Security lives in the database, not the app

Every table in `public` has row-level security enabled and at least one
policy. The browser holds the `anon` key, which grants nothing by itself —
what a request can read or write is decided by the policies in
`supabase/migrations/`. Two `SECURITY DEFINER` helpers, `auth_user_role()`
and `auth_user_municipality()`, resolve the caller's identity without
recursive policy lookups.

The consequence worth remembering: **adding a table means adding its
policies in the same migration.** A table without RLS is public the moment
PostgREST sees it.

The `service_role` key bypasses RLS entirely. It is used in exactly one
place — the Next.js route handlers under `src/app/api/` — and never reaches
the browser.

### Roles

Four roles, defined once in `src/lib/roles.ts` and mirrored by the
`user_role` enum in the database:

| Role | Scope |
|---|---|
| `admin` | System-wide; manages users, municipalities, indicators, weights |
| `data_entry` | Enters indicator data for one municipality |
| `decision_maker` | Reviews and approves that municipality's submissions |
| `researcher` | Reads across all municipalities, enters nothing |

There is no self-registration: admins create accounts, and the new user is
prompted to change the temporary password on first sign-in.

### Approval gating

Indicator data moves through `scald_data_submissions`:
`submitted` → `approved`, or back via `revision_requested`. Two consequences
are enforced in the database rather than the UI:

- Once a (municipality, year) is `submitted` or `approved`, its entries are
  locked against further edits (migration 018).
- The anonymous `/explore` page only sees entries for `approved`
  (municipality, year) pairs (migration 022).

### Scoring

Scores are computed in the browser from the raw entries, in
`src/lib/scores.ts` — per category, per set, and an overall figure, weighted
by `category_weight_overrides`. 31 indicators score inversely (lower raw
value is better); this is carried in the indicator metadata as
`scoringDirection`, not special-cased in the scoring code.

### Portability

The stack deliberately avoids anything that exists only in Supabase's hosted
product: no Edge Functions, no Realtime channels, no Storage buckets, no
Vault, no dashboard-configured cron. Everything schema-related is a numbered
file in `supabase/migrations/`, applied by `scripts/migrate.sh`, so the same
sequence produces the same database on a laptop or on the university server.

### Internationalisation

`next-intl`, with messages under `apps/web/messages/`. English only at
present (`src/lib/i18n/config.ts`), but the plumbing is in place: partner
languages are added by dropping in a message catalogue and extending
`locales`.

### Accessibility (WCAG 2.1 AA)

Radix UI primitives for keyboard navigation and ARIA semantics, a
`SkipToMain` component for 2.4.1 Bypass Blocks, and contrast ratios fixed in
the Tailwind config.

## Repository layout

```
apps/web/                 the application
  src/app/                App Router pages; (auth) and (dashboard) groups
  src/app/api/            route handlers — the only service-role code
  src/components/         feature-grouped UI
  src/lib/                scoring, Supabase clients, services, roles
  messages/               next-intl catalogues
supabase/migrations/      numbered SQL; the schema's source of truth
scripts/                  migrate.sh, gen-supabase-keys.mjs
infrastructure/docker/    production compose + Caddyfile
docs/deployment/          runbook and first-time setup guide
```
