-- ── Routine versioning ────────────────────────────────────────────────────────
alter table routines
  add column if not exists version        integer     default 1,
  add column if not exists superseded_at  timestamptz;

-- is_active already exists; ensure default
alter table routines
  alter column is_active set default true;

-- ── Store last goal config on profile ────────────────────────────────────────
alter table profiles
  add column if not exists last_goal_config        jsonb,
  add column if not exists updated_preferences_at  timestamptz;

-- ── notes column on workout_sessions (for HIIT log) ──────────────────────────
alter table workout_sessions
  add column if not exists notes text;

-- ── Index for fast active-routine lookup ─────────────────────────────────────
create index if not exists idx_routines_user_active
  on routines (user_id, is_active)
  where is_active = true;
