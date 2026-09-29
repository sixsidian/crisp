-- Channel portal - initial schema
-- Submission data is stored as JSONB because the exact assessment
-- questions aren't finalised yet. Add typed columns later once the
-- questionnaire is fixed, without needing to migrate existing rows.

create extension if not exists "pgcrypto";

-- Partner-facing user accounts. Supabase Auth owns the actual
-- credentials; this table extends auth.users with role/company info.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'partner' check (role in ('partner', 'admin')),
  partner_company text,
  full_name text,
  created_at timestamptz not null default now()
);

-- A corporate customer record, entered by a partner.
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles (id) on delete cascade,
  company_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One assessment run against a customer. A customer can have several
-- submissions over time (re-assessment). "data" holds whatever the
-- intake form currently asks - deliberately schema-less for now.
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  partner_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'processing', 'complete', 'failed')),
  data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The Claude-generated report for a submission. Kept separate from
-- submissions so a submission can be re-run without losing the
-- previous report (retention policy: decide and enforce a deletion
-- job later - see compliance notes in README).
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions (id) on delete cascade,
  readiness_score integer,
  report jsonb not null,
  model text not null,
  generated_at timestamptz not null default now()
);

create index customers_partner_id_idx on public.customers (partner_id);
create index submissions_customer_id_idx on public.submissions (customer_id);
create index submissions_partner_id_idx on public.submissions (partner_id);
create index reports_submission_id_idx on public.reports (submission_id);

-- Row level security: partners only ever see their own rows.
-- Admins (role = 'admin' in profiles) see everything.

alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.submissions enable row level security;
alter table public.reports enable row level security;

create function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- profiles
create policy "profiles: read own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

-- customers
create policy "customers: partner reads own" on public.customers
  for select using (partner_id = auth.uid() or public.is_admin());
create policy "customers: partner writes own" on public.customers
  for insert with check (partner_id = auth.uid());
create policy "customers: partner updates own" on public.customers
  for update using (partner_id = auth.uid() or public.is_admin());

-- submissions
create policy "submissions: partner reads own" on public.submissions
  for select using (partner_id = auth.uid() or public.is_admin());
create policy "submissions: partner writes own" on public.submissions
  for insert with check (partner_id = auth.uid());
create policy "submissions: partner updates own" on public.submissions
  for update using (partner_id = auth.uid() or public.is_admin());

-- reports: no direct partner writes - only the server (service role)
-- inserts a report, after calling the Claude API.
create policy "reports: partner reads own" on public.reports
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.submissions s
      where s.id = submission_id and s.partner_id = auth.uid()
    )
  );
