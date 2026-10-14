-- FUTEDU bioimpedance — Supabase schema.
-- Run once in Supabase → SQL Editor. Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).

create table if not exists public.players (
  id          text primary key,          -- slugified name, e.g. "akiles-duran"
  name        text not null,
  active      boolean not null default true,
  health_note text,
  created_at  timestamptz not null default now()
);

create table if not exists public.rounds (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  closed     boolean not null default false,
  closed_on  date,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id                        uuid primary key default gen_random_uuid(),
  round_id                  uuid not null references public.rounds(id) on delete cascade,
  player_id                 text not null references public.players(id) on delete cascade,
  measured_on               date not null default current_date,
  body_fat_percent          numeric,
  subcutaneous_fat_percent  numeric,
  total_body_water_percent  numeric,
  bmi                       numeric,
  fat_free_mass_kg          numeric,
  visceral_fat              numeric,
  skeletal_muscle_mass_kg   numeric,
  weight_kg                 numeric,
  balance_upper             text check (balance_upper   in ('balanced','slight','severe')),
  balance_lower             text check (balance_lower   in ('balanced','slight','severe')),
  balance_overall           text check (balance_overall in ('balanced','slight','severe')),
  unique (round_id, player_id)
);

create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- Row Level Security: nobody without a login can read or write anything.
-- Sign-ups are disabled in Authentication settings, so "authenticated" = you.
alter table public.players      enable row level security;
alter table public.rounds       enable row level security;
alter table public.measurements enable row level security;
alter table public.settings     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['players','rounds','measurements','settings'] loop
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
