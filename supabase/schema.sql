-- ============================================================
-- Pareshani — PostgreSQL schema for Supabase
-- Run this in the Supabase SQL editor (or via CLI) first.
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
create table if not exists public.categories (
  id            smallint generated always as identity primary key,
  slug          text not null unique,
  name          text not null unique,
  description   text,
  icon          text,
  sort_order    smallint not null default 0,
  created_at    timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  username      text unique,
  bio           text,
  avatar_url    text,
  is_suspended  boolean not null default false,
  suspend_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint name_len check (char_length(name) between 2 and 80),
  constraint username_fmt check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  constraint bio_len check (bio is null or char_length(bio) <= 400)
);

create index if not exists profiles_username_idx on public.profiles (username);

-- ------------------------------------------------------------
-- Roles
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  role        text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.profiles(id)
);

-- ------------------------------------------------------------
-- Problems
-- ------------------------------------------------------------
create table if not exists public.problems (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete restrict,
  title         text not null,
  description   text not null,
  category_id   smallint not null references public.categories(id),
  tags          text[] not null default '{}',
  is_anonymous  boolean not null default false,
  status        text not null default 'published'
                  check (status in ('published', 'hidden', 'deleted', 'pending')),
  reply_count   integer not null default 0,
  helpful_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint title_len check (char_length(btrim(title)) between 8 and 140),
  constraint desc_len check (char_length(btrim(description)) between 20 and 8000)
);

create index if not exists problems_status_created_idx
  on public.problems (status, created_at desc);
create index if not exists problems_category_idx
  on public.problems (category_id, created_at desc);
create index if not exists problems_user_idx
  on public.problems (user_id, created_at desc);
create index if not exists problems_title_trgm
  on public.problems using gin (title gin_trgm_ops);
create index if not exists problems_desc_trgm
  on public.problems using gin (description gin_trgm_ops);
create index if not exists problems_tags_gin
  on public.problems using gin (tags);

-- ------------------------------------------------------------
-- Replies
-- ------------------------------------------------------------
create table if not exists public.replies (
  id            uuid primary key default gen_random_uuid(),
  problem_id    uuid not null references public.problems(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete restrict,
  content       text not null,
  is_anonymous  boolean not null default false,
  status        text not null default 'published'
                  check (status in ('published', 'hidden', 'deleted')),
  helpful_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint content_len check (char_length(btrim(content)) between 2 and 4000)
);

create index if not exists replies_problem_idx
  on public.replies (problem_id, created_at);
create index if not exists replies_user_idx
  on public.replies (user_id, created_at desc);

-- ------------------------------------------------------------
-- Helpful votes
-- ------------------------------------------------------------
create table if not exists public.problem_helpful (
  problem_id  uuid not null references public.problems(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (problem_id, user_id)
);

create table if not exists public.reply_helpful (
  reply_id    uuid not null references public.replies(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (reply_id, user_id)
);

-- ------------------------------------------------------------
-- Saved / bookmarks
-- ------------------------------------------------------------
create table if not exists public.saved_problems (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  problem_id  uuid not null references public.problems(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, problem_id)
);

-- ------------------------------------------------------------
-- Reports
-- ------------------------------------------------------------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references public.profiles(id) on delete cascade,
  problem_id    uuid references public.problems(id) on delete cascade,
  reply_id      uuid references public.replies(id) on delete cascade,
  reason        text not null check (reason in (
                  'spam','harassment','abuse','hate','inappropriate',
                  'personal_information','scam','other'
                )),
  description   text,
  status        text not null default 'open'
                  check (status in ('open','reviewing','resolved','rejected')),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references public.profiles(id),
  resolution_note text,
  constraint report_target check (
    (problem_id is not null and reply_id is null)
    or (problem_id is null and reply_id is not null)
  )
);

create unique index if not exists reports_unique_problem
  on public.reports (reporter_id, problem_id)
  where problem_id is not null and status in ('open','reviewing');
create unique index if not exists reports_unique_reply
  on public.reports (reporter_id, reply_id)
  where reply_id is not null and status in ('open','reviewing');

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ------------------------------------------------------------
-- Moderation history
-- ------------------------------------------------------------
create table if not exists public.moderation_actions (
  id            uuid primary key default gen_random_uuid(),
  actor_id      uuid not null references public.profiles(id),
  action        text not null,
  target_type   text not null check (target_type in ('problem','reply','user','report')),
  target_id     uuid not null,
  note          text,
  created_at    timestamptz not null default now()
);

create index if not exists moderation_created_idx
  on public.moderation_actions (created_at desc);

-- ------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text,
  link          text,
  problem_id    uuid references public.problems(id) on delete cascade,
  reply_id      uuid references public.replies(id) on delete cascade,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, is_read, created_at desc);

-- ------------------------------------------------------------
-- Contact messages (optional inbox for /contact)
-- ------------------------------------------------------------
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  message     text not null,
  user_id     uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  constraint contact_msg_len check (char_length(message) between 10 and 2000)
);

-- ------------------------------------------------------------
-- Updated-at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_problems_updated on public.problems;
create trigger trg_problems_updated
  before update on public.problems
  for each row execute function public.set_updated_at();

drop trigger if exists trg_replies_updated on public.replies;
create trigger trg_replies_updated
  before update on public.replies
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Auto-create profile + default role on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_name text;
  raw_uname text;
begin
  raw_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'Member'
  );
  raw_uname := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    '[^a-z0-9_]', '', 'g'
  ));
  if char_length(raw_uname) < 3 then
    raw_uname := 'user' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if exists (select 1 from public.profiles where username = raw_uname) then
    raw_uname := raw_uname || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  insert into public.profiles (id, name, username)
  values (new.id, left(raw_name, 80), left(raw_uname, 24));

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Maintain reply_count / helpful_count
-- ------------------------------------------------------------
create or replace function public.bump_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.status = 'published' then
    update public.problems set reply_count = reply_count + 1 where id = new.problem_id;
  elsif tg_op = 'UPDATE' then
    if old.status = 'published' and new.status <> 'published' then
      update public.problems set reply_count = greatest(reply_count - 1, 0) where id = new.problem_id;
    elsif old.status <> 'published' and new.status = 'published' then
      update public.problems set reply_count = reply_count + 1 where id = new.problem_id;
    end if;
  elsif tg_op = 'DELETE' and old.status = 'published' then
    update public.problems set reply_count = greatest(reply_count - 1, 0) where id = old.problem_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reply_count on public.replies;
create trigger trg_reply_count
  after insert or update of status or delete on public.replies
  for each row execute function public.bump_reply_count();

create or replace function public.bump_problem_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.problems set helpful_count = helpful_count + 1 where id = new.problem_id;
  else
    update public.problems set helpful_count = greatest(helpful_count - 1, 0) where id = old.problem_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_problem_helpful on public.problem_helpful;
create trigger trg_problem_helpful
  after insert or delete on public.problem_helpful
  for each row execute function public.bump_problem_helpful();

create or replace function public.bump_reply_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.replies set helpful_count = helpful_count + 1 where id = new.reply_id;
  else
    update public.replies set helpful_count = greatest(helpful_count - 1, 0) where id = old.reply_id;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_reply_helpful on public.reply_helpful;
create trigger trg_reply_helpful
  after insert or delete on public.reply_helpful
  for each row execute function public.bump_reply_helpful();

-- ------------------------------------------------------------
-- Notify problem owner on new reply / helpful
-- ------------------------------------------------------------
create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  ptitle text;
begin
  if new.status <> 'published' then
    return new;
  end if;
  select user_id, title into owner, ptitle from public.problems where id = new.problem_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, title, body, link, problem_id, reply_id)
    values (
      owner,
      'reply',
      'Kisi ne aapki pareshani par jawab diya',
      left(ptitle, 80),
      'problem.html?id=' || new.problem_id::text,
      new.problem_id,
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_reply on public.replies;
create trigger trg_notify_reply
  after insert on public.replies
  for each row execute function public.notify_on_reply();

create or replace function public.notify_on_problem_helpful()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  ptitle text;
begin
  select user_id, title into owner, ptitle from public.problems where id = new.problem_id;
  if owner is not null and owner <> new.user_id then
    insert into public.notifications (user_id, type, title, body, link, problem_id)
    values (
      owner,
      'helpful',
      'Kisi ne aapki pareshani ko helpful mark kiya',
      left(ptitle, 80),
      'problem.html?id=' || new.problem_id::text,
      new.problem_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_helpful on public.problem_helpful;
create trigger trg_notify_helpful
  after insert on public.problem_helpful
  for each row execute function public.notify_on_problem_helpful();

-- ------------------------------------------------------------
-- Rate-limit helpers (used by RLS / policies)
-- ------------------------------------------------------------
create or replace function public.recent_problem_count(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.problems
  where user_id = uid
    and created_at > now() - interval '10 minutes';
$$;

create or replace function public.recent_reply_count(uid uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.replies
  where user_id = uid
    and created_at > now() - interval '2 minutes';
$$;

-- ------------------------------------------------------------
-- Role helper
-- ------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'user'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'moderator');
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_not_suspended()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select not is_suspended from public.profiles where id = auth.uid()),
    false
  );
$$;
