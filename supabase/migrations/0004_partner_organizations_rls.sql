-- 0003 created public.partner_organizations but never enabled row
-- level security on it or granted any policies - it was left wide
-- open to whatever default table grants your Supabase project applies
-- to the authenticated role, which (depending on your project's
-- default privileges) could let any signed-in partner rename an
-- existing organization or create fake ones. Locking it down: any
-- signed-in user can read organization names (not sensitive, and
-- needed to show "which partner you're in" in the header), but only
-- an admin (or a direct/service connection) can create, rename, or
-- delete one.

alter table public.partner_organizations enable row level security;

create policy "partner_organizations: authenticated read" on public.partner_organizations
  for select using (auth.uid() is not null or public.is_admin());

create policy "partner_organizations: admin writes" on public.partner_organizations
  for insert with check (public.is_admin());

create policy "partner_organizations: admin updates" on public.partner_organizations
  for update using (public.is_admin());

create policy "partner_organizations: admin deletes" on public.partner_organizations
  for delete using (public.is_admin());
