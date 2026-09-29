-- Partner organizations, org-wide visibility, and a change-history log.
--
-- Run this whole script once against each Supabase project (crisp-dev,
-- then crisp-prod) - same combined-script approach as 0002.
--
-- IMPORTANT - manual step after running this: every EXISTING partner
-- profile will have partner_org_id = null until you set it (see the
-- worked example at the bottom of this file). Until you do, that
-- partner will not be able to see or create any customers - org_id
-- matching is how visibility is now enforced, and null never matches
-- null in a Postgres RLS comparison. New profiles created after this
-- migration have the same requirement.
--
-- This script also fixes a real security gap that predates this
-- change: "profiles: update own" only checked that a partner was
-- updating their own row, not which columns - so any partner could,
-- via a direct API call (not through this app's own UI, which never
-- did this), have set their own role to 'admin' or, after this
-- migration, their own partner_org_id to someone else's organization.
-- The trigger added below blocks both.

create table public.partner_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column partner_org_id uuid references public.partner_organizations (id);

-- Turn any existing free-text partner_company values into real
-- organizations and point each profile at its org, then drop the old
-- free-text column - it's superseded by the org relation, which is
-- what makes shared visibility between colleagues actually reliable
-- (no "Softcat" vs "SoftCat" vs "softcat" mismatches).
insert into public.partner_organizations (name)
select distinct partner_company
from public.profiles
where partner_company is not null and partner_company <> ''
on conflict (name) do nothing;

update public.profiles p
set partner_org_id = o.id
from public.partner_organizations o
where p.partner_company = o.name
  and p.partner_org_id is null;

alter table public.profiles drop column partner_company;

alter table public.customers
  add column org_id uuid references public.partner_organizations (id);

update public.customers c
set org_id = p.partner_org_id
from public.profiles p
where c.partner_id = p.id
  and c.org_id is null;

create index customers_org_id_idx on public.customers (org_id);

-- Change-history log. Deliberately records only that a change
-- happened and who made it, never the actual data entered.
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  submission_id uuid references public.submissions (id) on delete set null,
  -- Nullable + set null on delete, not restrict: a history row should
  -- never block deleting the user who made it (e.g. someone leaving
  -- the partner) - it just loses the "who" for that older entry.
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index activity_log_customer_id_idx on public.activity_log (customer_id);

alter table public.activity_log enable row level security;

-- Helper mirroring is_admin(): the calling user's organization, reused
-- by every policy below so colleagues at the same partner organization
-- see each other's customers, submissions, reports and history.
create function public.my_org_id()
returns uuid
language sql
security definer
stable
as $$
  select partner_org_id from public.profiles where id = auth.uid();
$$;

-- Block partners from escalating their own privileges or moving
-- themselves into a different organization via a direct API call.
-- Only blocks when there's an authenticated, non-admin partner
-- actually making the change (auth.uid() is set - i.e. a request
-- through Supabase's PostgREST API using a partner's own session).
-- A direct SQL connection (the Supabase SQL editor, a migration, or
-- the service-role key) has no auth.uid() at all and is left alone -
-- otherwise this would also silently block the admin's own "assign
-- this partner to an organization" SQL at the bottom of this file.
create function public.prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.partner_org_id := old.partner_org_id;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_profile_self_privilege_escalation();

-- profiles: partners can now also read their org colleagues' profiles
-- (needed to show names like "Edited by Jane Doe" on shared records).
drop policy "profiles: read own" on public.profiles;
create policy "profiles: read own or org" on public.profiles
  for select using (
    id = auth.uid()
    or public.is_admin()
    or (partner_org_id is not null and partner_org_id = public.my_org_id())
  );

-- customers: org-wide instead of creator-only.
drop policy "customers: partner reads own" on public.customers;
drop policy "customers: partner writes own" on public.customers;
drop policy "customers: partner updates own" on public.customers;

create policy "customers: org reads" on public.customers
  for select using (org_id = public.my_org_id() or public.is_admin());
create policy "customers: org writes" on public.customers
  for insert with check (org_id = public.my_org_id() and partner_id = auth.uid());
create policy "customers: org updates" on public.customers
  for update using (org_id = public.my_org_id() or public.is_admin());

-- submissions: visibility follows the parent customer's org.
drop policy "submissions: partner reads own" on public.submissions;
drop policy "submissions: partner writes own" on public.submissions;
drop policy "submissions: partner updates own" on public.submissions;

create policy "submissions: org reads" on public.submissions
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.org_id = public.my_org_id()
    )
  );
create policy "submissions: org writes" on public.submissions
  for insert with check (
    partner_id = auth.uid()
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.org_id = public.my_org_id()
    )
  );
create policy "submissions: org updates" on public.submissions
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.org_id = public.my_org_id()
    )
  );

-- reports: visibility follows the submission's customer's org.
drop policy "reports: partner reads own" on public.reports;
create policy "reports: org reads" on public.reports
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.submissions s
      join public.customers c on c.id = s.customer_id
      where s.id = submission_id and c.org_id = public.my_org_id()
    )
  );

-- activity_log: same org-wide visibility; a partner may only log
-- activity against their own actions, on a customer their org can see.
create policy "activity_log: org reads" on public.activity_log
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.org_id = public.my_org_id()
    )
  );
create policy "activity_log: org writes" on public.activity_log
  for insert with check (
    actor_id = auth.uid()
    and exists (
      select 1 from public.customers c
      where c.id = customer_id and c.org_id = public.my_org_id()
    )
  );

-- Worked example - run manually per partner, after this script, for
-- every existing profile (and any new one created outside this app,
-- since there's still no in-app sign-up/invite flow):
--
--   insert into public.partner_organizations (name) values ('Softcat')
--     returning id;
--   update public.profiles set partner_org_id = '<id from above>'
--     where id = '<the user''s auth.users id>';
