-- TodayPlan: per-user plan history
-- Run this once in the Supabase SQL editor for your project.

create table if not exists public.plans (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text,
  plan_date     text,
  is_finalized  boolean not null default false,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists plans_user_created_idx
  on public.plans (user_id, created_at desc);

alter table public.plans enable row level security;

-- Only the owning user can read/write their rows.
drop policy if exists "Users manage own plans" on public.plans;
create policy "Users manage own plans"
  on public.plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
