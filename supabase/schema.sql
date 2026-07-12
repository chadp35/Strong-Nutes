-- Run this once in your Supabase project's SQL editor (Dashboard > SQL Editor > New query).
-- It creates one table holding each user's app data, with Row Level Security so
-- every user can only ever read or write their own row.

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  log jsonb not null default '{}'::jsonb,
  plan jsonb,
  shopping_checked jsonb not null default '{}'::jsonb,
  pantry jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "Users can view their own state"
  on app_state for select
  using (auth.uid() = user_id);

create policy "Users can insert their own state"
  on app_state for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own state"
  on app_state for update
  using (auth.uid() = user_id);

-- Keep updated_at current on every write
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists app_state_updated_at on app_state;
create trigger app_state_updated_at
before update on app_state
for each row execute function set_updated_at();
