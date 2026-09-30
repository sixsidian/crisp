alter table public.profiles
  add column must_change_password boolean not null default false;

create policy "profiles: admin update" on public.profiles
  for update using (public.is_admin());
