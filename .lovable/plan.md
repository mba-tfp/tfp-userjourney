## Goal

Persist each user's journey server-side so it survives browser clears and follows them across devices. Remove the Export / Import / Reset toolbar buttons that only exist because data lives in `localStorage`.

## What changes for the user

- First visit prompts a login (email + password, no email confirmation so it's instant).
- Their journey auto-saves to the cloud and reloads on any device.
- The toolbar loses **Export JSON**, **Import JSON**, and **Reset to defaults**. A small "Sign out" control replaces them.
- New users start from the same seeded demo journey they see today.

## Architecture

1. **Enable Lovable Cloud** (Supabase under the hood — auth + Postgres).
2. **Schema** — one row per user holding the whole journey as JSONB. Keeps the existing `JourneyDoc` shape; no schema churn when we add fields later.

   ```sql
   create table public.journeys (
     user_id uuid primary key references auth.users(id) on delete cascade,
     doc jsonb not null,
     updated_at timestamptz not null default now()
   );
   -- grants + RLS so each user only sees their own row
   ```

3. **Auth gate** — wrap the app in the template's `_authenticated` layout; unauthenticated users land on `/auth` (email + password, auto-confirm).
4. **Data layer** — replace `localStorage` in `src/lib/journey-store.ts` with:
   - Initial load: `select doc from journeys where user_id = auth.uid()`. If missing, insert `seedDoc`.
   - Saves: debounced (~600ms) `upsert` of the full doc. Same in-memory `useState` + `update()` ergonomics, so call sites (`JourneyMap`, `/tags`, etc.) don't change.
5. **Toolbar cleanup** in `JourneyMap.tsx`: remove the three buttons, the hidden file input, and the `exportJson` / `onImport` / `reset` wiring. Add a "Sign out" icon button.
6. **Keep `importDoc` / `reset` in the store** as internal helpers (used by initial hydration), but no UI surfaces them.

## Out of scope

- Sharing a journey with another user, multiple journeys per user, social login, password reset UI, migrating existing `localStorage` data into the cloud on first login (we'll just seed fresh — the demo content is identical).

## Files touched

- New: `supabase/migrations/<timestamp>_journeys.sql`, `src/routes/auth.tsx` (if not already present from the auth template), minor wiring under `src/routes/_authenticated/`.
- Edit: `src/lib/journey-store.ts` (swap persistence), `src/components/journey/JourneyMap.tsx` (toolbar), route files moved under `_authenticated` so the gate applies.
