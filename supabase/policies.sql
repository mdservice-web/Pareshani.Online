-- ============================================================
-- Pareshani — Row Level Security
-- Run AFTER schema.sql
-- ============================================================

alter table public.categories enable row level security;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.problems enable row level security;
alter table public.replies enable row level security;
alter table public.problem_helpful enable row level security;
alter table public.reply_helpful enable row level security;
alter table public.saved_problems enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_messages enable row level security;

-- Drop existing policies so this file is re-runnable
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ======================== CATEGORIES ========================
create policy "categories_public_read"
  on public.categories for select
  using (true);

create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ======================== PROFILES ========================
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

create policy "profiles_self_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Inserts happen via security-definer trigger only.
-- Staff can update (suspend etc.)
create policy "profiles_staff_update"
  on public.profiles for update
  using (public.is_staff())
  with check (public.is_staff());

-- ======================== USER ROLES ========================
create policy "roles_self_read"
  on public.user_roles for select
  using (auth.uid() = user_id or public.is_staff());

create policy "roles_admin_write"
  on public.user_roles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ======================== PROBLEMS ========================
create policy "problems_public_read_published"
  on public.problems for select
  using (
    status = 'published'
    or user_id = auth.uid()
    or public.is_staff()
  );

create policy "problems_auth_insert"
  on public.problems for insert
  with check (
    auth.uid() = user_id
    and public.is_not_suspended()
    and public.recent_problem_count(auth.uid()) < 5
    and status in ('published', 'pending')
  );

create policy "problems_owner_update"
  on public.problems for update
  using (auth.uid() = user_id and public.is_not_suspended())
  with check (auth.uid() = user_id);

create policy "problems_staff_update"
  on public.problems for update
  using (public.is_staff())
  with check (public.is_staff());

-- Soft-delete preferred; hard delete allowed for owner of unpublished-or-own
create policy "problems_owner_delete"
  on public.problems for delete
  using (auth.uid() = user_id);

create policy "problems_staff_delete"
  on public.problems for delete
  using (public.is_staff());

-- ======================== REPLIES ========================
create policy "replies_public_read"
  on public.replies for select
  using (
    status = 'published'
    or user_id = auth.uid()
    or public.is_staff()
  );

create policy "replies_auth_insert"
  on public.replies for insert
  with check (
    auth.uid() = user_id
    and public.is_not_suspended()
    and public.recent_reply_count(auth.uid()) < 8
    and status = 'published'
  );

create policy "replies_owner_update"
  on public.replies for update
  using (auth.uid() = user_id and public.is_not_suspended())
  with check (auth.uid() = user_id);

create policy "replies_staff_update"
  on public.replies for update
  using (public.is_staff())
  with check (public.is_staff());

create policy "replies_owner_delete"
  on public.replies for delete
  using (auth.uid() = user_id);

create policy "replies_staff_delete"
  on public.replies for delete
  using (public.is_staff());

-- ======================== HELPFUL ========================
create policy "problem_helpful_read"
  on public.problem_helpful for select
  using (true);

create policy "problem_helpful_insert"
  on public.problem_helpful for insert
  with check (auth.uid() = user_id and public.is_not_suspended());

create policy "problem_helpful_delete"
  on public.problem_helpful for delete
  using (auth.uid() = user_id);

create policy "reply_helpful_read"
  on public.reply_helpful for select
  using (true);

create policy "reply_helpful_insert"
  on public.reply_helpful for insert
  with check (auth.uid() = user_id and public.is_not_suspended());

create policy "reply_helpful_delete"
  on public.reply_helpful for delete
  using (auth.uid() = user_id);

-- ======================== SAVED ========================
create policy "saved_own_read"
  on public.saved_problems for select
  using (auth.uid() = user_id);

create policy "saved_own_insert"
  on public.saved_problems for insert
  with check (auth.uid() = user_id);

create policy "saved_own_delete"
  on public.saved_problems for delete
  using (auth.uid() = user_id);

-- ======================== REPORTS ========================
create policy "reports_own_or_staff_read"
  on public.reports for select
  using (auth.uid() = reporter_id or public.is_staff());

create policy "reports_auth_insert"
  on public.reports for insert
  with check (auth.uid() = reporter_id and public.is_not_suspended());

create policy "reports_staff_update"
  on public.reports for update
  using (public.is_staff())
  with check (public.is_staff());

-- ======================== MODERATION ========================
create policy "moderation_staff_read"
  on public.moderation_actions for select
  using (public.is_staff());

create policy "moderation_staff_insert"
  on public.moderation_actions for insert
  with check (public.is_staff() and actor_id = auth.uid());

-- ======================== NOTIFICATIONS ========================
create policy "notifications_own_read"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications_own_update"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "notifications_own_delete"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Inserts happen from security-definer triggers.

-- ======================== CONTACT ========================
create policy "contact_insert"
  on public.contact_messages for insert
  with check (
    char_length(btrim(name)) >= 2
    and char_length(btrim(message)) >= 10
  );

create policy "contact_staff_read"
  on public.contact_messages for select
  using (public.is_staff());

-- ============================================================
-- Grants (Supabase roles)
-- ============================================================
grant usage on schema public to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant select on public.problems to anon, authenticated;
grant select on public.replies to anon, authenticated;
grant select on public.problem_helpful to anon, authenticated;
grant select on public.reply_helpful to anon, authenticated;

grant select, insert, update, delete on public.problems to authenticated;
grant select, insert, update, delete on public.replies to authenticated;
grant select, insert, delete on public.problem_helpful to authenticated;
grant select, insert, delete on public.reply_helpful to authenticated;
grant select, insert, delete on public.saved_problems to authenticated;
grant select, insert on public.reports to authenticated;
grant update on public.reports to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant select, insert on public.moderation_actions to authenticated;
