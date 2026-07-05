# SCALD Data Entry — Database Setup

The data-entry feature persists all indicator entries, category completions,
and set badges per authenticated user in Supabase. If Supabase env vars are
missing, the app falls back to localStorage-only mode.

## 1. Environment variables

Create `apps/web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Values come from Supabase Dashboard → Project Settings → API.

## 2. Apply the migration

The tables live in `supabase/migrations/002_scald_data_entry.sql`. Apply via
one of the following:

### Option A — Supabase Dashboard (fastest)

Open **Project → SQL Editor**, paste the entire contents of
`002_scald_data_entry.sql`, and run.

### Option B — Supabase CLI

```bash
supabase link --project-ref <your-ref>
supabase db push
```

### Option C — psql (self-hosted)

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/002_scald_data_entry.sql
```

## 3. Tables created

| Table | Purpose |
|---|---|
| `scald_indicator_entries` | 188 rows max per user — score, raw_value |
| `scald_category_completions` | 25 rows max per user — completion timestamps |
| `scald_set_badges` | 4 rows max per user — ES / SS / MS / ECS badges |

All three tables have Row-Level Security enabled so users can only
read/write their own rows.

## 4. How the client stays in sync

- On mount, `DataEntryDashboard` calls `initFromServer()` — the store
  overwrites local cache with server truth.
- On every `saveEntry` / `completeCategory` / `badge`, the store fires a
  parallel upsert to Supabase (fire-and-forget with silent error handling).
- A **sync status pill** (top of `/data-entry`) shows the current state:
  Loading · Syncing · Synced · Offline.
- On `SIGNED_OUT`, `DashboardShell` clears the local store so the next
  user doesn't see leaked data from localStorage.
- The **Reset all** button both wipes local state and issues DELETE
  statements against the three tables.

## 5. Offline behavior

The store keeps the `zustand/persist` middleware pointing at
`scald-data-entry` in localStorage. If the browser is offline or Supabase
is unreachable, edits persist locally and the sync pill shows "Offline".
Writes are not queued for later replay — this is a demo limitation.
