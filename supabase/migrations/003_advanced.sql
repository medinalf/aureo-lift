-- ─── 1RM History ─────────────────────────────────────────────────────────────
create table if not exists one_rep_max_history (
  id            uuid default uuid_generate_v4() primary key,
  user_id       uuid references auth.users on delete cascade not null,
  exercise_id   uuid references exercises on delete cascade not null,
  one_rep_max   decimal(7,2) not null,
  weight_kg     decimal(7,2),
  reps          smallint,
  calculated_at timestamptz default now()
);

alter table one_rep_max_history enable row level security;

drop policy if exists "own 1rm" on one_rep_max_history;
create policy "own 1rm" on one_rep_max_history
  for all using (auth.uid() = user_id);

create index if not exists idx_1rm_user_ex
  on one_rep_max_history (user_id, exercise_id, calculated_at desc);

-- ─── Extend workout_sets ──────────────────────────────────────────────────────
alter table workout_sets
  add column if not exists is_warmup boolean default false,
  add column if not exists rpe       smallint check (rpe between 1 and 10);

-- ─── Trigger: auto-insert 1RM on set insert ──────────────────────────────────
create or replace function fn_update_one_rep_max()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_1rm     decimal;
begin
  if new.is_warmup = true or new.weight_kg is null or new.reps is null
     or new.reps <= 0 or new.weight_kg <= 0
  then return new; end if;

  select user_id into v_user_id from workout_sessions where id = new.session_id;
  v_1rm := round(new.weight_kg * (1.0 + new.reps::decimal / 30.0), 2);

  insert into one_rep_max_history (user_id, exercise_id, one_rep_max, weight_kg, reps)
  values (v_user_id, new.exercise_id, v_1rm, new.weight_kg, new.reps);

  return new;
end;
$$;

drop trigger if exists trg_1rm on workout_sets;
create trigger trg_1rm
  after insert on workout_sets
  for each row execute function fn_update_one_rep_max();
