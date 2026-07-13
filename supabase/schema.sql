-- Run this once in your Supabase project's SQL editor (Dashboard > SQL Editor > New query).
-- It creates one table holding each user's app data, with Row Level Security so
-- every user can only ever read or write their own row (plus a scoped exception
-- for coaches viewing their own assigned clients — see below).

create table if not exists app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  log jsonb not null default '{}'::jsonb,
  plan jsonb,
  shopping_checked jsonb not null default '{}'::jsonb,
  pantry jsonb not null default '[]'::jsonb,
  custom_foods jsonb not null default '[]'::jsonb,
  body_metrics jsonb not null default '[]'::jsonb,
  water jsonb not null default '{}'::jsonb,
  contact_email text,
  custom_recipes jsonb not null default '[]'::jsonb,
  discovered_products jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Safe to re-run: adds columns if this table already existed from an earlier
-- version of this schema.
alter table app_state add column if not exists custom_foods jsonb not null default '[]'::jsonb;
alter table app_state add column if not exists body_metrics jsonb not null default '[]'::jsonb;
alter table app_state add column if not exists water jsonb not null default '{}'::jsonb;
alter table app_state add column if not exists contact_email text;
alter table app_state add column if not exists custom_recipes jsonb not null default '[]'::jsonb;
alter table app_state add column if not exists discovered_products jsonb not null default '[]'::jsonb;

alter table app_state enable row level security;

drop policy if exists "Users can view their own state" on app_state;
create policy "Users can view their own state"
  on app_state for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own state" on app_state;
create policy "Users can insert their own state"
  on app_state for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own state" on app_state;
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

-- ============================================================
-- Coach-client feature
-- ============================================================

-- Marks specific accounts as coaches. Nobody can add themselves — rows here
-- are inserted manually by you (see the one-time step at the bottom).
create table if not exists coaches (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

alter table coaches enable row level security;

-- Everyone signed in can see the list of coaches (needed to populate the
-- "choose your coach" picker) but nobody can write to this table from the app.
drop policy if exists "Anyone signed in can view the coach list" on coaches;
create policy "Anyone signed in can view the coach list"
  on coaches for select
  using (auth.role() = 'authenticated');

-- Lets a coach read (never write) the full state of any client who has chosen
-- them — this is what powers the coach dashboard. This is an ADDITIONAL
-- permissive policy alongside "Users can view their own state" above; Postgres
-- combines multiple permissive SELECT policies with OR, so this only grants
-- extra read access, it never takes anything away from the owner policy.
drop policy if exists "Coaches can view their assigned clients' state" on app_state;
create policy "Coaches can view their assigned clients' state"
  on app_state for select
  using (
    exists (select 1 from coaches c where c.user_id = auth.uid())
    and (profile->>'coachId') = auth.uid()::text
  );

-- Comments a coach or client leave on a specific check-in (or as general
-- encouragement). Either side can post in their own thread; both sides, plus
-- the assigned coach, can read it.
create table if not exists coach_comments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null default 'general', -- 'body_metric' | 'general'
  target_id text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table coach_comments enable row level security;

drop policy if exists "Participants can view comments" on coach_comments;
create policy "Participants can view comments"
  on coach_comments for select
  using (
    auth.uid() = client_id
    or auth.uid() = author_id
    or exists (
      select 1 from app_state a
      where a.user_id = coach_comments.client_id
      and (a.profile->>'coachId') = auth.uid()::text
    )
  );

drop policy if exists "Client or their assigned coach can post" on coach_comments;
create policy "Client or their assigned coach can post"
  on coach_comments for insert
  with check (
    auth.uid() = author_id
    and (
      auth.uid() = client_id
      or exists (
        select 1 from app_state a
        where a.user_id = coach_comments.client_id
        and (a.profile->>'coachId') = auth.uid()::text
      )
    )
  );

-- Lightweight reactions ("likes") on a check-in, same access pattern as comments.
create table if not exists coach_reactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null default 'body_metric',
  target_id text not null,
  emoji text not null default '💪',
  created_at timestamptz not null default now(),
  unique (client_id, author_id, target_type, target_id)
);

alter table coach_reactions enable row level security;

drop policy if exists "Participants can view reactions" on coach_reactions;
create policy "Participants can view reactions"
  on coach_reactions for select
  using (
    auth.uid() = client_id
    or auth.uid() = author_id
    or exists (
      select 1 from app_state a
      where a.user_id = coach_reactions.client_id
      and (a.profile->>'coachId') = auth.uid()::text
    )
  );

drop policy if exists "Client or their assigned coach can react" on coach_reactions;
create policy "Client or their assigned coach can react"
  on coach_reactions for insert
  with check (
    auth.uid() = author_id
    and (
      auth.uid() = client_id
      or exists (
        select 1 from app_state a
        where a.user_id = coach_reactions.client_id
        and (a.profile->>'coachId') = auth.uid()::text
      )
    )
  );

drop policy if exists "Author can remove their own reaction" on coach_reactions;
create policy "Author can remove their own reaction"
  on coach_reactions for delete
  using (auth.uid() = author_id);

-- ============================================================
-- ONE-TIME STEP — run this yourself after chadp35@gmail.com has an account:
--
--   insert into coaches (user_id, display_name)
--   select id, 'Coach Penson' from auth.users where email = 'chadp35@gmail.com'
--   on conflict (user_id) do update set display_name = excluded.display_name;
--
-- That's the only manual step. Everything else (clients choosing a coach,
-- the coach dashboard, comments/reactions) works through the app from there.
-- ============================================================
