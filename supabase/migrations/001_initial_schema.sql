create extension if not exists pgcrypto;

do $$ begin create type game_status as enum ('lobby', 'active', 'paused', 'finished'); exception when duplicate_object then null; end $$;
do $$ begin create type team_color as enum ('RED', 'BLUE', 'GREEN', 'YELLOW'); exception when duplicate_object then null; end $$;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  pin varchar(6) unique not null check (pin ~ '^[0-9]{6}$'),
  teacher_token text unique not null,
  status game_status not null default 'lobby',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  color team_color not null, custom_name varchar(40) not null, score integer not null default 0,
  created_at timestamptz not null default now(), unique(game_id, color)
);
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade, display_name varchar(40) not null,
  joined_at timestamptz not null default now()
);
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists games_updated_at on public.games;
create trigger games_updated_at before update on public.games for each row execute function public.touch_updated_at();

alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.players enable row level security;
create policy "public can read games" on public.games for select using (true);
create policy "public can read teams" on public.teams for select using (true);
create policy "public can read players" on public.players for select using (true);
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.players;
