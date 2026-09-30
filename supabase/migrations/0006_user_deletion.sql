do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.customers'::regclass
    and confrelid = 'public.profiles'::regclass
    and contype = 'f';
  if cname is not null then
    execute format('alter table public.customers drop constraint %I', cname);
  end if;
end $$;

alter table public.customers alter column partner_id drop not null;

alter table public.customers
  add constraint customers_partner_id_fkey
  foreign key (partner_id) references public.profiles (id) on delete set null;

do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.submissions'::regclass
    and confrelid = 'public.profiles'::regclass
    and contype = 'f';
  if cname is not null then
    execute format('alter table public.submissions drop constraint %I', cname);
  end if;
end $$;

alter table public.submissions alter column partner_id drop not null;

alter table public.submissions
  add constraint submissions_partner_id_fkey
  foreign key (partner_id) references public.profiles (id) on delete set null;
