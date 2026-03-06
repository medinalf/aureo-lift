-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Session status enum
DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  preferences jsonb default '{"weight_unit":"kg","theme":"dark","rest_timer":90}'::jsonb,
  created_at timestamptz default now()
);

-- Exercises
create table if not exists exercises (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  muscle_group text not null,
  secondary_muscles text[],
  equipment text,
  instructions text,
  image_url text,
  is_custom boolean default false,
  user_id uuid references auth.users on delete cascade,
  created_at timestamptz default now()
);

-- Routines
create table if not exists routines (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Routine days
create table if not exists routine_days (
  id uuid default uuid_generate_v4() primary key,
  routine_id uuid references routines on delete cascade not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  day_label text
);

-- Routine exercises
create table if not exists routine_exercises (
  id uuid default uuid_generate_v4() primary key,
  routine_day_id uuid references routine_days on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  order_index smallint default 0,
  target_sets smallint default 3,
  target_reps text default '8-12',
  target_rest_seconds smallint default 90
);

-- Workout sessions
create table if not exists workout_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  routine_id uuid references routines on delete set null,
  started_at timestamptz default now(),
  finished_at timestamptz,
  notes text,
  status session_status default 'in_progress'
);

-- Workout sets
create table if not exists workout_sets (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references workout_sessions on delete cascade not null,
  exercise_id uuid references exercises on delete cascade not null,
  set_number smallint not null,
  weight_kg numeric(6,2),
  reps smallint,
  rpe numeric(3,1),
  is_warmup boolean default false,
  completed_at timestamptz default now(),
  notes text
);

-- RLS
alter table profiles enable row level security;
alter table routines enable row level security;
alter table routine_days enable row level security;
alter table routine_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_sets enable row level security;
alter table exercises enable row level security;

create policy "own_profile" on profiles for all using (auth.uid() = id);
create policy "own_routines" on routines for all using (auth.uid() = user_id);
create policy "own_routine_days" on routine_days for all using (exists (select 1 from routines where id = routine_days.routine_id and user_id = auth.uid()));
create policy "own_routine_exercises" on routine_exercises for all using (exists (select 1 from routine_days rd join routines r on r.id = rd.routine_id where rd.id = routine_exercises.routine_day_id and r.user_id = auth.uid()));
create policy "own_sessions" on workout_sessions for all using (auth.uid() = user_id);
create policy "own_sets" on workout_sets for all using (exists (select 1 from workout_sessions where id = workout_sets.session_id and user_id = auth.uid()));
create policy "view_exercises" on exercises for select using (user_id is null or user_id = auth.uid());
create policy "manage_custom_exercises" on exercises for insert with check (auth.uid() = user_id);

-- Auto-create profile
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

-- Seed exercises
insert into exercises (name, muscle_group, equipment) values
  ('Press de Banca', 'chest', 'barbell'),
  ('Press Inclinado con Barra', 'chest', 'barbell'),
  ('Press con Mancuernas', 'chest', 'dumbbell'),
  ('Aperturas con Mancuernas', 'chest', 'dumbbell'),
  ('Fondos en Paralelas', 'chest', 'bodyweight'),
  ('Press Militar', 'shoulders', 'barbell'),
  ('Press Arnold', 'shoulders', 'dumbbell'),
  ('Elevaciones Laterales', 'shoulders', 'dumbbell'),
  ('Elevaciones Frontales', 'shoulders', 'dumbbell'),
  ('Peso Muerto', 'back', 'barbell'),
  ('Dominadas', 'back', 'bodyweight'),
  ('Remo con Barra', 'back', 'barbell'),
  ('Remo con Mancuerna', 'back', 'dumbbell'),
  ('Jalón al Pecho', 'back', 'cable'),
  ('Sentadilla', 'legs', 'barbell'),
  ('Sentadilla Frontal', 'legs', 'barbell'),
  ('Prensa de Piernas', 'legs', 'machine'),
  ('Extensiones de Cuádriceps', 'legs', 'machine'),
  ('Curl de Femoral', 'legs', 'machine'),
  ('Peso Muerto Rumano', 'legs', 'barbell'),
  ('Hip Thrust', 'glutes', 'barbell'),
  ('Patada de Glúteo', 'glutes', 'cable'),
  ('Curl de Bíceps con Barra', 'arms', 'barbell'),
  ('Curl de Bíceps con Mancuerna', 'arms', 'dumbbell'),
  ('Curl Martillo', 'arms', 'dumbbell'),
  ('Extensiones de Tríceps', 'arms', 'cable'),
  ('Press Francés', 'arms', 'barbell'),
  ('Fondos de Tríceps', 'arms', 'bodyweight'),
  ('Plancha', 'core', 'bodyweight'),
  ('Crunch con Cable', 'core', 'cable'),
  ('Rueda Abdominal', 'core', 'bodyweight'),
  ('Elevaciones de Piernas', 'core', 'bodyweight')
on conflict do nothing;
