-- ============================================================
-- Pareshani — seed categories (safe to re-run)
-- ============================================================

insert into public.categories (slug, name, description, icon, sort_order) values
  ('career',        'Career & Jobs',       'Naukri, interviews, career change, workplace.',          'briefcase', 10),
  ('education',     'Education',           'Padhai, exams, college, skills.',                        'book',      20),
  ('money',         'Money',               'Budget, savings, bills, financial stress.',              'wallet',    30),
  ('family',        'Family',              'Ghar, parents, siblings, family decisions.',             'home',      40),
  ('relationships', 'Relationships',       'Dosti, family bonds, respectful social connections.',    'heart',     50),
  ('business',      'Business',            'Startup, shop, clients, small business.',                'store',     60),
  ('technology',    'Technology',          'Phones, internet, software, learning tech.',             'cpu',       70),
  ('daily-life',    'Daily Life',          'Rozmarra ke masle, time, habits, living.',               'sun',       80),
  ('health',        'Health & Wellbeing',  'General support only — not medical advice.',             'activity',  90),
  ('other',         'Other',               'Jo category match na kare.',                             'dots',     100)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

-- ------------------------------------------------------------
-- How to make the first admin (run AFTER you register):
--
-- update public.user_roles
--   set role = 'admin'
--   where user_id = (select id from public.profiles where username = 'YOUR_USERNAME');
--
-- Never hardcode passwords. Promote accounts only from the SQL editor.
-- ------------------------------------------------------------
