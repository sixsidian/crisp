alter table public.partner_organizations rename to partner_organisations;

alter table public.profiles rename column partner_org_id to partner_organisation_id;
alter table public.customers rename column org_id to organisation_id;

alter index customers_org_id_idx rename to customers_organisation_id_idx;

alter function public.my_org_id() rename to my_organisation_id;
create or replace function public.my_organisation_id()
returns uuid
language sql
security definer
stable
as $$
  select partner_organisation_id from public.profiles where id = auth.uid();
$$;

create or replace function public.prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.role := old.role;
    new.partner_organisation_id := old.partner_organisation_id;
  end if;
  return new;
end;
$$;
