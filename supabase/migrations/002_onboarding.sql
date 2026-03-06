-- Add onboarding columns to profiles
alter table profiles
  add column if not exists fitness_goal text,
  add column if not exists weekly_frequency smallint,
  add column if not exists experience_level text,
  add column if not exists equipment text[],
  add column if not exists onboarding_completed boolean default false;
