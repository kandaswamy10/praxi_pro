// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────

export const sendOTP = (email) =>
  supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${import.meta.env.VITE_APP_URL || 'https://praxi-pro.vercel.app'}/auth/callback`,
    },
  });

export const verifyOTP = (email, token) =>
  supabase.auth.verifyOtp({ email, token, type: 'email' });

export const handleAuthCallback = () =>
  supabase.auth.getSessionFromUrl({ reuse_existing: false });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback` },
  });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

export const onAuthChange = (cb) =>
  supabase.auth.onAuthStateChange((_event, session) => cb(session));

/* ─────────────────────────────────────────────────────────────────────────────
   SUPABASE SQL SCHEMA
   Run this in your Supabase SQL editor to set up all tables.
   Dashboard → SQL Editor → New query → paste → Run
─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS PROFILE (extends Supabase auth.users)
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text,
  name          text,
  avatar_url    text,
  storage_mode  text default 'local' check (storage_mode in ('local','drive')),
  enabled_tabs  text[] default array['dashboard','work','learning','personal','finance'],
  pinned_tab    text default 'dashboard',
  theme         text default 'auto' check (theme in ('auto','light','dark')),
  ai_config     jsonb default '{}',
  created_at    timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can manage own profile"
  on public.profiles for all using (auth.uid() = id);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- EVENTS
create table public.events (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  team_id         uuid,
  title           text not null,
  description     text,
  date            date not null,
  time            time,
  category        text check (category in ('Work','Learning','Personal','Finance')),
  tags            text[] default '{}',
  color           text,
  url             text,
  alarm_lead_min  integer,
  alarm_fired     boolean default false,
  is_completed    boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.events enable row level security;
create policy "Users manage own events"
  on public.events for all using (auth.uid() = user_id);
create index events_user_date on public.events(user_id, date);

-- LEARNING GOALS
create table public.learning_goals (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade not null,
  title           text not null,
  category        text,
  target_hours    numeric default 0,
  completed_hours numeric default 0,
  due_date        date,
  tags            text[] default '{}',
  color           text,
  is_shared       boolean default false,
  share_token     text unique,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
alter table public.learning_goals enable row level security;
create policy "Users manage own goals"
  on public.learning_goals for all using (auth.uid() = user_id);
create policy "Anyone can view shared goals"
  on public.learning_goals for select using (is_shared = true);

-- TOPICS (sub-documents of learning goals)
create table public.topics (
  id              uuid default uuid_generate_v4() primary key,
  goal_id         uuid references public.learning_goals on delete cascade not null,
  user_id         uuid references auth.users on delete cascade not null,
  title           text not null,
  url             text,
  domain          text,
  difficulty      text check (difficulty in ('beginner','intermediate','advanced')),
  estimated_mins  integer default 30,
  dependencies    uuid[] default '{}',
  is_completed    boolean default false,
  completed_at    timestamptz,
  quiz            jsonb default '[]',
  sort_order      integer default 0,
  created_at      timestamptz default now()
);
alter table public.topics enable row level security;
create policy "Users manage own topics"
  on public.topics for all using (auth.uid() = user_id);

-- LINK GROUPS
create table public.link_groups (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  tab_id      text not null,
  name        text not null,
  is_default  boolean default false,
  is_shared   boolean default false,
  share_token text unique,
  created_at  timestamptz default now()
);
alter table public.link_groups enable row level security;
create policy "Users manage own link groups"
  on public.link_groups for all using (auth.uid() = user_id);

-- LINKS (sub-documents of link groups)
create table public.links (
  id          uuid default uuid_generate_v4() primary key,
  group_id    uuid references public.link_groups on delete cascade not null,
  user_id     uuid references auth.users on delete cascade not null,
  title       text not null,
  url         text not null,
  created_at  timestamptz default now()
);
alter table public.links enable row level security;
create policy "Users manage own links"
  on public.links for all using (auth.uid() = user_id);

─────────────────────────────────────────────────────────────────────────────*/
